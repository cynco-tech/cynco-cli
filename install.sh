#!/bin/bash
# Cynco CLI installer for macOS and Linux
# Usage: curl -fsSL https://cli.cynco.io/install.sh | bash
#        curl -fsSL https://cli.cynco.io/install.sh | bash -s v0.1.0

main() {
    set -euo pipefail

    REPO="cynco-tech/cynco-cli"
    BINARY_NAME="cynco"
    GITHUB_BASE="${GITHUB_BASE:-https://github.com}"
    INSTALL_DIR="${CYNCO_INSTALL:-$HOME/.cynco}"
    BIN_DIR="$INSTALL_DIR/bin"

    # ---------------------------------------------------------------------------
    # Color output — only when attached to a terminal
    # ---------------------------------------------------------------------------

    if [ -t 1 ]; then
        BOLD="\033[1m"
        RED="\033[0;31m"
        GREEN="\033[0;32m"
        YELLOW="\033[0;33m"
        CYAN="\033[0;36m"
        RESET="\033[0m"
    else
        BOLD=""
        RED=""
        GREEN=""
        YELLOW=""
        CYAN=""
        RESET=""
    fi

    # ---------------------------------------------------------------------------
    # Helper functions
    # ---------------------------------------------------------------------------

    error() {
        printf "${RED}error${RESET}: %s\n" "$@" >&2
        exit 1
    }

    warn() {
        printf "${YELLOW}warn${RESET}: %s\n" "$@" >&2
    }

    info() {
        printf "${CYAN}info${RESET}: %s\n" "$@"
    }

    success() {
        printf "${GREEN}success${RESET}: %s\n" "$@"
    }

    bold() {
        printf "${BOLD}%s${RESET}" "$@"
    }

    # Replace $HOME prefix with ~ for display
    tildify() {
        if [ "${1#"$HOME"}" != "$1" ]; then
            echo "~${1#"$HOME"}"
        else
            echo "$1"
        fi
    }

    # ---------------------------------------------------------------------------
    # Dependency checks
    # ---------------------------------------------------------------------------

    if ! command -v curl > /dev/null 2>&1; then
        error "curl is required but not found. Please install curl and try again."
    fi

    if ! command -v tar > /dev/null 2>&1; then
        error "tar is required but not found. Please install tar and try again."
    fi

    # ---------------------------------------------------------------------------
    # Validate GITHUB_BASE override
    # ---------------------------------------------------------------------------

    if [ "$GITHUB_BASE" != "https://github.com" ]; then
        case "$GITHUB_BASE" in
            https://*) ;;
            *) error "GITHUB_BASE must start with https:// (got: $GITHUB_BASE)" ;;
        esac
    fi

    # ---------------------------------------------------------------------------
    # OS / Architecture detection
    # ---------------------------------------------------------------------------

    KERNEL=$(uname -s)
    MACHINE=$(uname -m)

    case "$KERNEL" in
        Darwin) OS="darwin" ;;
        Linux)  OS="linux" ;;
        *)      error "Unsupported operating system: $KERNEL. Cynco CLI supports macOS and Linux." ;;
    esac

    case "$MACHINE" in
        x86_64|amd64) ARCH="x64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) error "Unsupported architecture: $MACHINE. Cynco CLI supports x64 and arm64." ;;
    esac

    # ---------------------------------------------------------------------------
    # Rosetta 2 detection — prefer native arm64 on Apple Silicon
    # ---------------------------------------------------------------------------

    if [ "$OS" = "darwin" ] && [ "$ARCH" = "x64" ]; then
        if sysctl -n sysctl.proc_translated 2>/dev/null | grep -q 1; then
            info "Detected Rosetta 2 translation. Installing native arm64 binary instead."
            ARCH="arm64"
        fi
    fi

    # ---------------------------------------------------------------------------
    # musl / Alpine Linux detection
    # ---------------------------------------------------------------------------

    if [ "$OS" = "linux" ]; then
        if ldd --version 2>&1 | grep -qi musl || [ -f /etc/alpine-release ]; then
            error "musl libc (Alpine Linux) is not currently supported.

Cynco CLI requires glibc. You can:
  1. Use a glibc-based container (e.g. debian, ubuntu)
  2. Install via npm:  npm install -g @cynco/cli
  3. Use a glibc compatibility layer: apk add gcompat"
        fi
    fi

    TARGET="${OS}-${ARCH}"

    # ---------------------------------------------------------------------------
    # Version resolution — pinned or latest
    # ---------------------------------------------------------------------------

    REQUESTED_VERSION="${1:-}"

    if [ -n "$REQUESTED_VERSION" ]; then
        # Validate semver format (v1.2.3 or 1.2.3, optional prerelease)
        case "$REQUESTED_VERSION" in
            v[0-9]*.[0-9]*.[0-9]*) VERSION="$REQUESTED_VERSION" ;;
            [0-9]*.[0-9]*.[0-9]*)  VERSION="v$REQUESTED_VERSION" ;;
            *) error "Invalid version format: '$REQUESTED_VERSION'. Expected semver (e.g. v0.1.0 or 0.1.0)." ;;
        esac
        info "Installing pinned version: $(bold "$VERSION")"
    else
        info "Fetching latest release..."

        LATEST_URL="${GITHUB_BASE}/${REPO}/releases/latest"

        # Follow the redirect to get the tag name from the final URL
        VERSION=$(curl --fail --silent --location --head "$LATEST_URL" 2>/dev/null \
            | grep -i "^location:" \
            | sed -E 's|.*/tag/([^ \r\n]+).*|\1|' \
            | tr -d '\r\n')

        if [ -z "$VERSION" ]; then
            # Fallback: query the API
            VERSION=$(curl --fail --silent --location \
                "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null \
                | grep '"tag_name"' \
                | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')
        fi

        if [ -z "$VERSION" ]; then
            error "Could not determine the latest version.
Check your internet connection or specify a version:
  curl -fsSL https://cli.cynco.io/install.sh | bash -s v0.1.0"
        fi
    fi

    # Strip leading v for display
    VERSION_NUMBER="${VERSION#v}"

    # ---------------------------------------------------------------------------
    # Download
    # ---------------------------------------------------------------------------

    ARCHIVE_NAME="cynco-${TARGET}.tar.gz"
    DOWNLOAD_URL="${GITHUB_BASE}/${REPO}/releases/download/${VERSION}/${ARCHIVE_NAME}"

    TMPDIR=$(mktemp -d)
    trap 'rm -rf "$TMPDIR"' EXIT

    info "Downloading $(bold "Cynco CLI v${VERSION_NUMBER}") for ${TARGET}..."
    info "  ${DOWNLOAD_URL}"
    echo ""

    HTTP_CODE=$(curl \
        --fail \
        --location \
        --progress-bar \
        --output "$TMPDIR/$ARCHIVE_NAME" \
        --write-out "%{http_code}" \
        "$DOWNLOAD_URL" 2>&1) || true

    if [ ! -f "$TMPDIR/$ARCHIVE_NAME" ] || [ ! -s "$TMPDIR/$ARCHIVE_NAME" ]; then
        case "$HTTP_CODE" in
            404)
                error "Release not found: Cynco CLI v${VERSION_NUMBER} for ${TARGET}.
The release or platform may not exist. Check available releases:
  ${GITHUB_BASE}/${REPO}/releases" ;;
            403)
                error "Rate limited by GitHub. Try again in a few minutes, or set a GITHUB_TOKEN." ;;
            *)
                error "Download failed (HTTP ${HTTP_CODE}).
URL: ${DOWNLOAD_URL}
Check your internet connection and try again." ;;
        esac
    fi

    # ---------------------------------------------------------------------------
    # Verify download integrity
    # ---------------------------------------------------------------------------

    # Attempt checksum verification if a sha256 sums file is published
    CHECKSUM_URL="${GITHUB_BASE}/${REPO}/releases/download/${VERSION}/checksums.txt"
    CHECKSUM_FILE="$TMPDIR/checksums.txt"

    if curl --fail --silent --location --output "$CHECKSUM_FILE" "$CHECKSUM_URL" 2>/dev/null; then
        if command -v sha256sum > /dev/null 2>&1; then
            EXPECTED=$(grep "$ARCHIVE_NAME" "$CHECKSUM_FILE" | awk '{print $1}')
            if [ -n "$EXPECTED" ]; then
                ACTUAL=$(sha256sum "$TMPDIR/$ARCHIVE_NAME" | awk '{print $1}')
                if [ "$EXPECTED" != "$ACTUAL" ]; then
                    error "Checksum verification failed.
Expected: $EXPECTED
  Actual: $ACTUAL
The download may be corrupted or tampered with. Try again."
                fi
                info "Checksum verified (sha256)"
            fi
        elif command -v shasum > /dev/null 2>&1; then
            EXPECTED=$(grep "$ARCHIVE_NAME" "$CHECKSUM_FILE" | awk '{print $1}')
            if [ -n "$EXPECTED" ]; then
                ACTUAL=$(shasum -a 256 "$TMPDIR/$ARCHIVE_NAME" | awk '{print $1}')
                if [ "$EXPECTED" != "$ACTUAL" ]; then
                    error "Checksum verification failed.
Expected: $EXPECTED
  Actual: $ACTUAL
The download may be corrupted or tampered with. Try again."
                fi
                info "Checksum verified (sha256)"
            fi
        fi
    fi

    # Sanity check: a valid CLI binary archive should be at least 1 MB
    FILE_SIZE=$(wc -c < "$TMPDIR/$ARCHIVE_NAME" | tr -d ' ')
    MIN_SIZE=1048576  # 1 MB
    if [ "$FILE_SIZE" -lt "$MIN_SIZE" ]; then
        warn "Downloaded file is unusually small (${FILE_SIZE} bytes). It may be corrupted."
    fi

    # ---------------------------------------------------------------------------
    # Extract + install
    # ---------------------------------------------------------------------------

    info "Extracting archive..."

    tar -xzf "$TMPDIR/$ARCHIVE_NAME" -C "$TMPDIR" 2>/dev/null \
        || error "Failed to extract archive. The download may be corrupted. Try again."

    # Find the binary — it may be at the top level or nested in a directory
    EXTRACTED_BINARY=""
    if [ -f "$TMPDIR/$BINARY_NAME" ]; then
        EXTRACTED_BINARY="$TMPDIR/$BINARY_NAME"
    else
        # Search one level deep
        EXTRACTED_BINARY=$(find "$TMPDIR" -maxdepth 2 -name "$BINARY_NAME" -type f 2>/dev/null | head -1)
    fi

    if [ -z "$EXTRACTED_BINARY" ] || [ ! -f "$EXTRACTED_BINARY" ]; then
        error "Could not find '$BINARY_NAME' binary in the downloaded archive."
    fi

    mkdir -p "$BIN_DIR"
    cp "$EXTRACTED_BINARY" "$BIN_DIR/$BINARY_NAME"
    chmod +x "$BIN_DIR/$BINARY_NAME"

    # ---------------------------------------------------------------------------
    # macOS quarantine flag removal
    # ---------------------------------------------------------------------------

    if [ "$OS" = "darwin" ]; then
        if command -v xattr > /dev/null 2>&1; then
            xattr -d com.apple.quarantine "$BIN_DIR/$BINARY_NAME" 2>/dev/null || true
        fi
    fi

    # ---------------------------------------------------------------------------
    # Verify installation
    # ---------------------------------------------------------------------------

    if "$BIN_DIR/$BINARY_NAME" --version > /dev/null 2>&1; then
        INSTALLED_VERSION=$("$BIN_DIR/$BINARY_NAME" --version 2>/dev/null || echo "v${VERSION_NUMBER}")
        success "Cynco CLI ${INSTALLED_VERSION} installed to $(tildify "$BIN_DIR/$BINARY_NAME")"
    else
        warn "Binary installed to $(tildify "$BIN_DIR/$BINARY_NAME") but could not verify."
        warn "You may need to allow it in System Settings > Privacy & Security on macOS."
    fi

    echo ""

    # ---------------------------------------------------------------------------
    # PATH setup
    # ---------------------------------------------------------------------------

    DISPLAY_DIR=$(tildify "$BIN_DIR")

    # Check if already in PATH
    case ":$PATH:" in
        *":$BIN_DIR:"*) IN_PATH=1 ;;
        *)              IN_PATH=0 ;;
    esac

    if [ "$IN_PATH" -eq 0 ]; then
        SHELL_NAME=$(basename "${SHELL:-/bin/sh}")
        SHELL_ENV=""
        EXPORT_LINE=""

        case "$SHELL_NAME" in
            zsh)
                SHELL_ENV="$HOME/.zshrc"
                EXPORT_LINE="export PATH=\"${BIN_DIR}:\$PATH\""
                ;;
            bash)
                # macOS uses .bash_profile for login shells; Linux uses .bashrc
                if [ "$OS" = "darwin" ]; then
                    if [ -f "$HOME/.bash_profile" ]; then
                        SHELL_ENV="$HOME/.bash_profile"
                    else
                        SHELL_ENV="$HOME/.bashrc"
                    fi
                else
                    SHELL_ENV="$HOME/.bashrc"
                fi
                EXPORT_LINE="export PATH=\"${BIN_DIR}:\$PATH\""
                ;;
            fish)
                SHELL_ENV="$HOME/.config/fish/config.fish"
                EXPORT_LINE="set -gx PATH ${BIN_DIR} \$PATH"
                ;;
            *)
                SHELL_ENV="$HOME/.profile"
                EXPORT_LINE="export PATH=\"${BIN_DIR}:\$PATH\""
                ;;
        esac

        ALREADY_IN_RC=0
        if [ -f "$SHELL_ENV" ] && grep -qF "$BIN_DIR" "$SHELL_ENV" 2>/dev/null; then
            ALREADY_IN_RC=1
        fi

        if [ "$ALREADY_IN_RC" -eq 0 ]; then
            # Ensure the parent directory exists (e.g. ~/.config/fish/ for fish shell)
            SHELL_ENV_DIR=$(dirname "$SHELL_ENV")
            if [ ! -d "$SHELL_ENV_DIR" ]; then
                mkdir -p "$SHELL_ENV_DIR"
            fi

            # Ensure a trailing newline before appending
            if [ -f "$SHELL_ENV" ]; then
                # Add newline if file doesn't end with one
                if [ -s "$SHELL_ENV" ] && [ "$(tail -c 1 "$SHELL_ENV" | wc -l)" -eq 0 ]; then
                    echo "" >> "$SHELL_ENV"
                fi
            fi

            echo "" >> "$SHELL_ENV"
            echo "# Cynco CLI" >> "$SHELL_ENV"
            echo "$EXPORT_LINE" >> "$SHELL_ENV"

            info "Added $(bold "$DISPLAY_DIR") to \$PATH in $(tildify "$SHELL_ENV")"
            echo ""
            info "To start using Cynco CLI, run:"
            echo ""
            printf "  ${BOLD}source %s${RESET}\n" "$(tildify "$SHELL_ENV")"
            echo ""
        else
            info "$(bold "$DISPLAY_DIR") is already configured in $(tildify "$SHELL_ENV")"
            echo ""
            info "To start using Cynco CLI, restart your terminal or run:"
            echo ""
            printf "  ${BOLD}source %s${RESET}\n" "$(tildify "$SHELL_ENV")"
            echo ""
        fi
    fi

    # ---------------------------------------------------------------------------
    # Next steps
    # ---------------------------------------------------------------------------

    printf "${BOLD}Getting started:${RESET}\n"
    echo ""
    printf "  ${CYAN}cynco auth login${RESET}           Log in to your account\n"
    printf "  ${CYAN}cynco --help${RESET}               Show all commands\n"
    echo ""
    info "Set your API key with: export CYNCO_API_KEY=cak_..."
    echo ""
}

# Wrapping in main() protects against partial download when piped from curl.
# If the connection drops mid-transfer, bash would execute a truncated script.
# With main(), bash parses the entire function first — if it's incomplete, it
# simply reports a syntax error instead of running partial commands.
main "$@"
