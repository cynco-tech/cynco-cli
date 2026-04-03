import { afterEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

// Mock config so tests don't read the real ~/.config/cynco/credentials.json
vi.mock('../../src/lib/config', () => ({
	resolveApiKey: vi.fn((flagValue?: string) => {
		if (flagValue) return { key: flagValue, source: 'flag' as const };
		const envKey = process.env.CYNCO_API_KEY;
		if (envKey) return { key: envKey, source: 'env' as const };
		return null;
	}),
	resolveProfileName: vi.fn(() => 'default'),
	listProfiles: vi.fn(() => []),
	readCredentials: vi.fn(() => null),
	getConfigDir: vi.fn(() => '/tmp/test-cynco'),
	invalidateCache: vi.fn(),
	storeApiKey: vi.fn(),
	maskKey: vi.fn((key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`),
}));

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
