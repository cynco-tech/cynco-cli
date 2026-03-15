import { execFile } from 'node:child_process';

export function openBrowser(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const cmd =
			process.platform === 'win32'
				? 'cmd.exe'
				: process.platform === 'darwin'
					? 'open'
					: 'xdg-open';
		const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
		execFile(cmd, args, { timeout: 5000 }, (err) => resolve(!err));
	});
}
