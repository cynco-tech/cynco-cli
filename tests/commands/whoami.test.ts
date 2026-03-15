import { afterEach, describe, expect, test } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

describe('whoami command', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		process.exitCode = undefined;
	});

	test('shows authenticated status with env key', async () => {
		const spies = setupOutputSpies();
		process.env.CYNCO_API_KEY = 'cak_test_key_1234';
		const { whoami } = await import('../../src/commands/whoami');
		await whoami.parseAsync([], { from: 'user' });
		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls[0]?.[0];
		expect(output).toContain('authenticated');
		expect(output).toContain('true');
	});

	test('shows not authenticated when no key', async () => {
		const spies = setupOutputSpies();
		delete process.env.CYNCO_API_KEY;
		const { whoami } = await import('../../src/commands/whoami');
		await whoami.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls[0]?.[0];
		expect(output).toContain('authenticated');
		expect(output).toContain('false');
		expect(process.exitCode).toBe(1);
	});
});
