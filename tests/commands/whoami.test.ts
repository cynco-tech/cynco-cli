import { afterEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

describe('whoami command', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
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
		// Prevent reading real credentials from ~/.config/cynco/
		const config = await import('../../src/lib/config');
		vi.spyOn(config, 'resolveApiKey').mockReturnValue(null);

		const { whoami } = await import('../../src/commands/whoami');
		await whoami.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls[0]?.[0];
		expect(output).toContain('authenticated');
		expect(output).toContain('false');
		expect(process.exitCode).toBe(1);
	});
});
