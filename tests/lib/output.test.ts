import { describe, expect, test } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

describe('output', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
	});

	test('outputResult prints JSON in non-interactive mode', async () => {
		const spies = setupOutputSpies();
		mockExitThrow();
		const { outputResult } = await import('../../src/lib/output');
		outputResult({ id: 'test_123' }, { json: true });
		expect(spies.log).toHaveBeenCalledWith(JSON.stringify({ id: 'test_123' }, null, 2));
	});

	test('outputError exits with code 1', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { outputError } = await import('../../src/lib/output');
		try {
			outputError({ message: 'something failed', code: 'test_error' }, { json: true });
		} catch (err) {
			expect(err).toBeInstanceOf(ExitError);
			expect((err as ExitError).code).toBe(1);
		}
	});

	test('errorMessage extracts Error message', async () => {
		const { errorMessage } = await import('../../src/lib/output');
		expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
		expect(errorMessage('not an error', 'fallback')).toBe('fallback');
		expect(errorMessage(null, 'fallback')).toBe('fallback');
	});
});

import { afterEach } from 'vitest';
