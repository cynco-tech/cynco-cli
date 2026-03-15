import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

// Mock browser open so it doesn't actually open anything
vi.mock('../../../src/lib/browser', () => ({
	openBrowser: vi.fn().mockResolvedValue(true),
}));

// Mock config so storeApiKey doesn't write to disk
vi.mock('../../../src/lib/config', () => ({
	resolveApiKey: vi.fn((flagValue?: string) => {
		if (flagValue) return { key: flagValue, source: 'flag' as const };
		const envKey = process.env.CYNCO_API_KEY;
		if (envKey) return { key: envKey, source: 'env' as const };
		return null;
	}),
	resolveProfileName: vi.fn(() => 'default'),
	storeApiKey: vi.fn(() => '/tmp/test/credentials.json'),
	listProfiles: vi.fn(() => []),
	readCredentials: vi.fn(() => null),
	getConfigDir: vi.fn(() => '/tmp/test'),
	invalidateCache: vi.fn(),
}));

describe('login command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('non-interactive login with --key flag succeeds', async () => {
		const spies = setupOutputSpies();

		// Mock fetch for validateApiKey - returns success
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { accounts: [] } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { login } = await import('../../../src/commands/auth/login');
		await login.parseAsync(['--key', 'cak_valid_test_key'], { from: 'user' });

		// Should have called fetch to validate the key
		expect(mockFetch).toHaveBeenCalled();

		// Should output result in non-interactive mode
		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join(' ');
		expect(output).toContain('authenticated');
	});

	test('rejects invalid key format (not starting with cak_)', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { login } = await import('../../../src/commands/auth/login');

		await expect(login.parseAsync(['--key', 'invalid_key_123'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});

	test('errors when no key provided in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { login } = await import('../../../src/commands/auth/login');

		await expect(login.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});

	test('validates key against API and fails if invalid', async () => {
		setupOutputSpies();
		mockExitThrow();

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: false,
				error: { code: 'unauthorized', message: 'Invalid API key' },
			}),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { login } = await import('../../../src/commands/auth/login');

		await expect(login.parseAsync(['--key', 'cak_bad_key'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});

	test('stores key under specified profile name', async () => {
		const _spies = setupOutputSpies();

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { accounts: [] } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { storeApiKey } = await import('../../../src/lib/config');

		const { login } = await import('../../../src/commands/auth/login');
		await login.parseAsync(['--key', 'cak_test_key', '--profile', 'staging'], {
			from: 'user',
		});

		expect(storeApiKey).toHaveBeenCalledWith('cak_test_key', 'staging');
	});
});
