import { vi } from 'vitest';

export class ExitError extends Error {
	code: number;
	constructor(code: number) {
		super(`process.exit(${code})`);
		this.code = code;
		this.name = 'ExitError';
	}
}

export function mockExitThrow() {
	vi.spyOn(process, 'exit').mockImplementation((code) => {
		throw new ExitError(code as number);
	});
}

export function setNonInteractive() {
	Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
	Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
}

export function captureTestEnv() {
	const origEnv = { ...process.env };
	const origStdinTTY = process.stdin.isTTY;
	const origStdoutTTY = process.stdout.isTTY;

	return function restore() {
		process.env = origEnv;
		Object.defineProperty(process.stdin, 'isTTY', {
			value: origStdinTTY,
			writable: true,
		});
		Object.defineProperty(process.stdout, 'isTTY', {
			value: origStdoutTTY,
			writable: true,
		});
	};
}

export function setupOutputSpies() {
	setNonInteractive();
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	return { log, error, stderr };
}

export async function expectExit1(fn: () => Promise<unknown>) {
	try {
		await fn();
		throw new Error('Expected process.exit(1) but it did not happen');
	} catch (err) {
		if (err instanceof ExitError) {
			if (err.code !== 1) {
				throw new Error(`Expected exit code 1, got ${err.code}`);
			}
			return;
		}
		throw err;
	}
}
