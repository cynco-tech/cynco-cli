# Cynco CLI installer for Windows
# Usage: irm https://cli.cynco.io/install.ps1 | iex
#        $env:CYNCO_VERSION = 'v0.1.0'; irm https://cli.cynco.io/install.ps1 | iex

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Speeds up Invoke-WebRequest significantly

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

$Repo = "cynco-tech/cynco-cli"
$BinaryName = "cynco.exe"
$GithubBase = if ($env:GITHUB_BASE) { $env:GITHUB_BASE } else { "https://github.com" }
$InstallDir = if ($env:CYNCO_INSTALL) { $env:CYNCO_INSTALL } else { Join-Path $env:USERPROFILE ".cynco" }
$BinDir = Join-Path $InstallDir "bin"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

function Write-Info {
    param([string]$Message)
    Write-Host "info: " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-Ok {
    param([string]$Message)
    Write-Host "success: " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "error: " -ForegroundColor Red -NoNewline
    Write-Host $Message
    exit 1
}

function Write-Warn {
    param([string]$Message)
    Write-Host "warn: " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Tildify {
    param([string]$Path)
    if ($Path.StartsWith($env:USERPROFILE)) {
        return "~" + $Path.Substring($env:USERPROFILE.Length)
    }
    return $Path
}

# ---------------------------------------------------------------------------
# Architecture validation
# ---------------------------------------------------------------------------

$Architecture = $null

try {
    $Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
} catch {
    # Fallback detection for older PowerShell versions
    if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
        $Architecture = "Arm64"
    } elseif ($env:PROCESSOR_ARCHITECTURE -eq "AMD64" -or $env:PROCESSOR_ARCHITEW6432 -eq "AMD64") {
        $Architecture = "X64"
    } else {
        $Architecture = $env:PROCESSOR_ARCHITECTURE
    }
}

switch ($Architecture) {
    { $_ -in "X64", "x64", "AMD64" } {
        $Target = "win-x64"
    }
    { $_ -in "Arm64", "arm64", "ARM64" } {
        $Target = "win-arm64"
    }
    default {
        Write-Fail "Unsupported architecture: $Architecture. Cynco CLI for Windows supports x64 and arm64."
    }
}

# ---------------------------------------------------------------------------
# Version resolution
# ---------------------------------------------------------------------------

$Version = $env:CYNCO_VERSION

if ($Version) {
    # Validate semver format
    if ($Version -match "^v?\d+\.\d+\.\d+") {
        if (-not $Version.StartsWith("v")) {
            $Version = "v$Version"
        }
        Write-Info "Installing pinned version: $Version"
    } else {
        Write-Fail "Invalid version format: '$Version'. Expected semver (e.g. v0.1.0 or 0.1.0)."
    }
} else {
    Write-Info "Fetching latest release..."

    try {
        # Force TLS 1.2 for PowerShell 5.1 compatibility
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        $ReleaseUrl = "https://api.github.com/repos/$Repo/releases/latest"
        $Headers = @{ "User-Agent" = "CyncoCLI-Installer" }

        $Release = Invoke-RestMethod -Uri $ReleaseUrl -Headers $Headers -TimeoutSec 30
        $Version = $Release.tag_name

        if (-not $Version) {
            Write-Fail "Could not determine latest version from GitHub API response."
        }
    } catch {
        $StatusCode = $null
        if ($_.Exception.Response) {
            $StatusCode = $_.Exception.Response.StatusCode.value__
        }

        switch ($StatusCode) {
            403 {
                Write-Fail "GitHub API rate limit exceeded. Try again in a few minutes, or pin a version:`n  `$env:CYNCO_VERSION = 'v0.1.0'; irm https://cli.cynco.io/install.ps1 | iex"
            }
            404 {
                Write-Fail "No releases found for $Repo. Check that the repository exists and has published releases."
            }
            default {
                Write-Fail "Failed to fetch latest release (HTTP $StatusCode): $($_.Exception.Message)"
            }
        }
    }
}

$VersionNumber = $Version -replace "^v", ""

# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

$ArchiveName = "cynco-${Target}.zip"
$DownloadUrl = "${GithubBase}/${Repo}/releases/download/${Version}/${ArchiveName}"

$TmpDir = Join-Path $env:TEMP "cynco-install-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

try {
    Write-Info "Downloading Cynco CLI v${VersionNumber} for ${Target}..."
    Write-Info "  $DownloadUrl"
    Write-Host ""

    # Force TLS 1.2 for PowerShell 5.1 compatibility
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $ArchivePath = Join-Path $TmpDir $ArchiveName

    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath -UseBasicParsing -TimeoutSec 120
    } catch {
        $StatusCode = $null
        if ($_.Exception.Response) {
            $StatusCode = $_.Exception.Response.StatusCode.value__
        }

        switch ($StatusCode) {
            404 {
                Write-Fail "Release not found: Cynco CLI v${VersionNumber} for ${Target}.`nThe release or platform may not exist. Check available releases:`n  ${GithubBase}/${Repo}/releases"
            }
            403 {
                Write-Fail "Download blocked (HTTP 403). You may be rate-limited by GitHub. Try again in a few minutes."
            }
            default {
                Write-Fail "Download failed (HTTP $StatusCode): $($_.Exception.Message)`nURL: $DownloadUrl`nCheck your internet connection and try again."
            }
        }
    }

    if (-not (Test-Path $ArchivePath)) {
        Write-Fail "Download completed but archive file not found at: $ArchivePath"
    }

    $FileSize = (Get-Item $ArchivePath).Length
    if ($FileSize -eq 0) {
        Write-Fail "Downloaded file is empty. The download may have been interrupted. Try again."
    }

    # ---------------------------------------------------------------------------
    # Verify download integrity
    # ---------------------------------------------------------------------------

    $ChecksumUrl = "${GithubBase}/${Repo}/releases/download/${Version}/checksums.txt"
    $ChecksumFile = Join-Path $TmpDir "checksums.txt"

    try {
        Invoke-WebRequest -Uri $ChecksumUrl -OutFile $ChecksumFile -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        $ChecksumContent = Get-Content $ChecksumFile -Raw
        $ExpectedHash = ($ChecksumContent -split "`n" | Where-Object { $_ -match [regex]::Escape($ArchiveName) } | ForEach-Object { ($_ -split '\s+')[0] }) | Select-Object -First 1

        if ($ExpectedHash) {
            $ActualHash = (Get-FileHash -Path $ArchivePath -Algorithm SHA256).Hash.ToLower()
            $ExpectedHash = $ExpectedHash.Trim().ToLower()

            if ($ActualHash -ne $ExpectedHash) {
                Write-Fail "Checksum verification failed.`nExpected: $ExpectedHash`n  Actual: $ActualHash`nThe download may be corrupted or tampered with. Try again."
            }
            Write-Info "Checksum verified (sha256)"
        }
    } catch {
        # Checksum file not available — continue without verification
    }

    # ---------------------------------------------------------------------------
    # Extract
    # ---------------------------------------------------------------------------

    Write-Info "Extracting archive..."

    try {
        Expand-Archive -Path $ArchivePath -DestinationPath $TmpDir -Force
    } catch {
        Write-Fail "Failed to extract archive: $($_.Exception.Message)`nThe download may be corrupted. Try again."
    }

    # Find the binary — may be at top level or nested
    $ExtractedBinary = $null

    $DirectPath = Join-Path $TmpDir $BinaryName
    if (Test-Path $DirectPath) {
        $ExtractedBinary = $DirectPath
    } else {
        $Found = Get-ChildItem -Path $TmpDir -Filter $BinaryName -Recurse -Depth 2 -File | Select-Object -First 1
        if ($Found) {
            $ExtractedBinary = $Found.FullName
        }
    }

    if (-not $ExtractedBinary -or -not (Test-Path $ExtractedBinary)) {
        Write-Fail "Could not find '$BinaryName' in the downloaded archive."
    }

    # ---------------------------------------------------------------------------
    # Install
    # ---------------------------------------------------------------------------

    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
    Copy-Item -Path $ExtractedBinary -Destination (Join-Path $BinDir $BinaryName) -Force

    $InstalledBinary = Join-Path $BinDir $BinaryName

    # ---------------------------------------------------------------------------
    # Verify installation
    # ---------------------------------------------------------------------------

    $Verified = $false

    try {
        $VersionOutput = & $InstalledBinary --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Cynco CLI ${VersionOutput} installed to $(Tildify $InstalledBinary)"
            $Verified = $true
        }
    } catch {
        # Binary may not be runnable yet
    }

    if (-not $Verified) {
        Write-Warn "Binary installed to $(Tildify $InstalledBinary) but could not verify."
        Write-Warn "You may need to unblock the file: Right-click > Properties > Unblock"
    }

    Write-Host ""

    # ---------------------------------------------------------------------------
    # PATH setup
    # ---------------------------------------------------------------------------

    $CurrentUserPath = [Environment]::GetEnvironmentVariable("PATH", "User")

    # Check if already in PATH
    $PathEntries = $CurrentUserPath -split ";"
    $AlreadyInPath = $PathEntries | Where-Object { $_.TrimEnd("\") -eq $BinDir.TrimEnd("\") }

    if (-not $AlreadyInPath) {
        # Add to User PATH (no admin rights required)
        $NewPath = "${BinDir};${CurrentUserPath}"
        [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")

        # Also update current session so the user can use cynco immediately
        $env:PATH = "${BinDir};${env:PATH}"

        Write-Info "Added $(Tildify $BinDir) to your User PATH."
        Write-Host ""
        Write-Info "To use Cynco CLI in existing terminals, restart them or run:"
        Write-Host ""
        Write-Host "  " -NoNewline
        Write-Host "`$env:PATH = `"${BinDir};`$env:PATH`"" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Info "$(Tildify $BinDir) is already in your PATH."
        Write-Host ""
    }

    # ---------------------------------------------------------------------------
    # Next steps
    # ---------------------------------------------------------------------------

    Write-Host "Getting started:" -ForegroundColor White
    Write-Host ""
    Write-Host "  cynco auth login" -ForegroundColor Cyan -NoNewline
    Write-Host "           Log in to your account"
    Write-Host "  cynco --help" -ForegroundColor Cyan -NoNewline
    Write-Host "               Show all commands"
    Write-Host ""
    Write-Info "Set your API key with: `$env:CYNCO_API_KEY = 'cak_...'"
    Write-Host ""

} finally {
    # Clean up temp directory
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}
