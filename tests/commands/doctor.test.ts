import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

// Mock update-check to control version check results
vi.mock('../../src/lib/update-check', () => ({
	fetchLatestVersion: vi.fn().mockResolvedValue('0.1.0'),
	isNewer: vi.fn().mockReturnValue(false),
}));

// Mock config to control API key resolution
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
	getConfigDir: vi.fn(() => '/tmp/test'),
	invalidateCache: vi.fn(),
	storeApiKey: vi.fn(),
}));

describe('doctor command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		process.exitCode = undefined;
	});

	test('all checks pass with valid API key and up-to-date version', async () => {
		const spies = setupOutputSpies();

		// Mock the CyncoClient used internally for API validation
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { accounts: [] } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { doctor } = await import('../../src/commands/doctor');
		await doctor.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		// In non-interactive mode, outputs JSON with checks
		expect(output).toContain('checks');
		expect(output).toContain('healthy');
		expect(output).toContain('true');
	});

	test('reports fail status when no API key', async () => {
		const spies = setupOutputSpies();
		delete process.env.CYNCO_API_KEY;

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: false,
				error: { code: 'unauthorized', message: 'No API key' },
			}),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { doctor } = await import('../../src/commands/doctor');
		await doctor.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('fail');
		expect(output).toContain('No API key');
	});

	test('sets exitCode to 1 when checks fail', async () => {
		const _spies = setupOutputSpies();
		delete process.env.CYNCO_API_KEY;

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: false,
				error: { code: 'unauthorized', message: 'Unauthorized' },
			}),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { doctor } = await import('../../src/commands/doctor');
		await doctor.parseAsync([], { from: 'user' });

		expect(process.exitCode).toBe(1);
	});

	test('reports API validation failure', async () => {
		const spies = setupOutputSpies();

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: false,
				error: { code: 'unauthorized', message: 'Invalid API key' },
			}),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { doctor } = await import('../../src/commands/doctor');
		await doctor.parseAsync([], { from: 'user' });

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('API');
		expect(output).toContain('fail');
	});

	test('JSON output includes structured check results', async () => {
		const spies = setupOutputSpies();

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { accounts: [] } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { doctor } = await import('../../src/commands/doctor');
		await doctor.parseAsync([], { from: 'user' });

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed).toHaveProperty('checks');
		expect(parsed).toHaveProperty('healthy');
		expect(Array.isArray(parsed.checks)).toBe(true);
		expect(parsed.checks.length).toBeGreaterThanOrEqual(3);
		for (const check of parsed.checks) {
			expect(check).toHaveProperty('name');
			expect(check).toHaveProperty('status');
			expect(check).toHaveProperty('message');
		}
	});
});
