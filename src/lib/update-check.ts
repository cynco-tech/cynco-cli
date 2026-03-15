import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from './config';
import { VERSION } from './version';

const CHECK_INTERVAL_MS = 1 * 60 * 60 * 1000;
export const GITHUB_RELEASES_URL =
	'https://api.github.com/repos/cynco-tech/cynco-cli/releases/latest';

type UpdateState = {
	lastChecked: number;
	latestVersion: string;
};

function getStatePath(): string {
	return join(getConfigDir(), 'update-state.json');
}

function readState(): UpdateState | null {
	try {
		return JSON.parse(readFileSync(getStatePath(), 'utf-8')) as UpdateState;
	} catch {
		return null;
	}
}

function writeState(state: UpdateState): void {
	mkdirSync(getConfigDir(), { recursive: true, mode: 0o700 });
	writeFileSync(getStatePath(), JSON.stringify(state), { mode: 0o600 });
}

export function isNewer(local: string, remote: string): boolean {
	const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
	const [lMaj = 0, lMin = 0, lPat = 0] = parse(local);
	const [rMaj = 0, rMin = 0, rPat = 0] = parse(remote);
	if (rMaj !== lMaj) {
		return rMaj > lMaj;
	}
	if (rMin !== lMin) {
		return rMin > lMin;
	}
	return rPat > lPat;
}

export async function fetchLatestVersion(): Promise<string | null> {
	try {
		const res = await fetch(GITHUB_RELEASES_URL, {
			headers: { Accept: 'application/vnd.github.v3+json' },
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) {
			return null;
		}
		const data = (await res.json()) as {
			tag_name?: string;
			prerelease?: boolean;
			draft?: boolean;
		};
		if (data.prerelease || data.draft) {
			return null;
		}
		const version = data.tag_name?.replace(/^v/, '');
		if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
			return null;
		}
		return version;
	} catch {
		return null;
	}
}

function shouldSkipCheck(): boolean {
	if (process.env.CYNCO_NO_UPDATE_NOTIFIER === '1') {
		return true;
	}
	if (process.env.CI === 'true' || process.env.CI === '1') {
		return true;
	}
	if (process.env.GITHUB_ACTIONS) {
		return true;
	}
	if (!process.stdout.isTTY) {
		return true;
	}
	return false;
}

export function detectInstallMethod(): string {
	const execPath = process.execPath || process.argv[0] || '';
	const scriptPath = process.argv[1] || '';

	if (
		process.env.npm_execpath ||
		/node_modules/.test(scriptPath) ||
		/node_modules/.test(execPath)
	) {
		return 'npm install -g cynco-cli';
	}

	if (/\/(Cellar|homebrew)\//i.test(execPath)) {
		return 'brew update && brew upgrade cynco';
	}

	if (/[/\\]\.cynco[/\\]bin[/\\]/.test(execPath)) {
		if (process.platform === 'win32') {
			return 'irm https://cli.cynco.io/install.ps1 | iex';
		}
		return 'curl -fsSL https://cli.cynco.io/install.sh | bash';
	}

	if (process.platform === 'win32') {
		return 'irm https://cli.cynco.io/install.ps1 | iex';
	}
	return 'curl -fsSL https://cli.cynco.io/install.sh | bash';
}

function formatNotice(latestVersion: string): string {
	const upgrade = detectInstallMethod();
	const isUrl = upgrade.startsWith('http');

	const dim = '\x1B[2m';
	const yellow = '\x1B[33m';
	const cyan = '\x1B[36m';
	const reset = '\x1B[0m';

	const lines = [
		'',
		`${dim}Update available: ${yellow}v${VERSION}${reset}${dim} → ${cyan}v${latestVersion}${reset}`,
		`${dim}${isUrl ? 'Visit' : 'Run'}: ${cyan}${upgrade}${reset}`,
	];

	if (process.platform === 'win32') {
		lines.push(
			`${dim}Or download from: ${cyan}https://github.com/cynco-tech/cynco-cli/releases/latest${reset}`,
		);
	}

	lines.push('');
	return lines.join('\n');
}

export async function checkForUpdates(): Promise<void> {
	if (shouldSkipCheck()) {
		return;
	}

	const state = readState();
	const now = Date.now();

	if (state && now - state.lastChecked < CHECK_INTERVAL_MS) {
		if (isNewer(VERSION, state.latestVersion)) {
			process.stderr.write(formatNotice(state.latestVersion));
		}
		return;
	}

	const latest = await fetchLatestVersion();
	if (!latest) {
		return;
	}

	try {
		writeState({ lastChecked: now, latestVersion: latest });
	} catch {
		// Best-effort: permission errors or read-only filesystems should not crash the CLI
	}

	if (isNewer(VERSION, latest)) {
		process.stderr.write(formatNotice(latest));
	}
}
