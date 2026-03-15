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
