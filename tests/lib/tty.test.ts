import { afterEach, describe, expect, test } from 'vitest';
import { captureTestEnv } from '../helpers';

describe('tty', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
	});

	test('isInteractive returns false when stdin is not TTY', async () => {
		Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
		Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
		const { isInteractive } = await import('../../src/lib/tty');
		expect(isInteractive()).toBe(false);
	});

	test('isInteractive returns false in CI', async () => {
		Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
		Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
		process.env.CI = 'true';
		const { isInteractive } = await import('../../src/lib/tty');
		expect(isInteractive()).toBe(false);
	});
});
