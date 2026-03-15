export function isInteractive(): boolean {
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return false;
	}
	if (process.env.CI === 'true' || process.env.CI === '1') {
		return false;
	}
	if (process.env.GITHUB_ACTIONS) {
		return false;
	}
	if (process.env.TERM === 'dumb') {
		return false;
	}
	return true;
}

export const isUnicodeSupported: boolean =
	process.platform !== 'win32' ||
	Boolean(process.env.WT_SESSION) ||
	process.env.TERM_PROGRAM === 'vscode';

export const TICK = isUnicodeSupported ? String.fromCodePoint(0x2714) : 'v';
export const CROSS = isUnicodeSupported ? String.fromCodePoint(0x2717) : 'x';
export const WARN = isUnicodeSupported ? String.fromCodePoint(0x26a0) : '!';
