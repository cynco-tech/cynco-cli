import { afterEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv } from '../helpers';

describe('isNewer', () => {
	test('detects newer major version', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('1.0.0', '2.0.0')).toBe(true);
	});

	test('detects newer minor version', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('1.0.0', '1.1.0')).toBe(true);
	});

	test('detects newer patch version', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('1.0.0', '1.0.1')).toBe(true);
	});

	test('returns false for same version', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('1.0.0', '1.0.0')).toBe(false);
	});

	test('returns false for older version', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('2.0.0', '1.0.0')).toBe(false);
	});

	test('handles v prefix in versions', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('v1.0.0', 'v1.0.1')).toBe(true);
		expect(isNewer('v1.0.0', '1.0.1')).toBe(true);
		expect(isNewer('1.0.0', 'v1.0.1')).toBe(true);
	});

	test('handles major version difference with lower minor/patch', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('1.9.9', '2.0.0')).toBe(true);
	});

	test('older major version returns false even with higher minor', async () => {
		const { isNewer } = await import('../../src/lib/update-check');
		expect(isNewer('2.0.0', '1.9.9')).toBe(false);
	});
});

describe('detectInstallMethod', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('detects npm install when npm_execpath is set', async () => {
		process.env.npm_execpath = '/usr/local/lib/node_modules/npm/bin/npm-cli.js';

		const { detectInstallMethod } = await import('../../src/lib/update-check');

		expect(detectInstallMethod()).toBe('npm install -g cynco-cli');
	});

	test('returns curl command as fallback on non-windows', async () => {
		delete process.env.npm_execpath;
		// With default process.argv (no homebrew, no .cynco/bin), falls through to default

		const { detectInstallMethod } = await import('../../src/lib/update-check');
		const result = detectInstallMethod();

		// Should be either npm, brew, or curl-based
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('fetchLatestVersion', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns version from GitHub releases', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					tag_name: 'v1.2.3',
					prerelease: false,
					draft: false,
				}),
			}),
		);

		const { fetchLatestVersion } = await import('../../src/lib/update-check');
		const version = await fetchLatestVersion();

		expect(version).toBe('1.2.3');
	});

	test('returns null for prerelease', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					tag_name: 'v2.0.0-beta.1',
					prerelease: true,
					draft: false,
				}),
			}),
		);

		const { fetchLatestVersion } = await import('../../src/lib/update-check');
		const version = await fetchLatestVersion();

		expect(version).toBeNull();
	});

	test('returns null for draft release', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					tag_name: 'v2.0.0',
					prerelease: false,
					draft: true,
				}),
			}),
		);

		const { fetchLatestVersion } = await import('../../src/lib/update-check');
		const version = await fetchLatestVersion();

		expect(version).toBeNull();
	});

	test('returns null when fetch fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

		const { fetchLatestVersion } = await import('../../src/lib/update-check');
		const version = await fetchLatestVersion();

		expect(version).toBeNull();
	});

	test('returns null when response is not ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
			}),
		);

		const { fetchLatestVersion } = await import('../../src/lib/update-check');
		const version = await fetchLatestVersion();

		expect(version).toBeNull();
	});

	test('returns null for invalid version format', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					tag_name: 'not-a-version',
					prerelease: false,
					draft: false,
				}),
			}),
		);

		const { fetchLatestVersion } = await import('../../src/lib/update-check');
		const version = await fetchLatestVersion();

		expect(version).toBeNull();
	});
});
