import { randomBytes } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	invalidateCache,
	listProfiles,
	maskKey,
	readCredentials,
	resolveApiKey,
	resolveProfileName,
	storeApiKey,
	validateProfileName,
} from '../../src/lib/config';

describe('config', () => {
	let TEST_DIR: string;

	beforeEach(() => {
		TEST_DIR = join(tmpdir(), `cynco-cli-test-config-${randomBytes(6).toString('hex')}`);
		mkdirSync(TEST_DIR, { recursive: true });
		vi.unstubAllEnvs();
		vi.stubEnv('XDG_CONFIG_HOME', TEST_DIR);
		delete process.env.CYNCO_API_KEY;
		delete process.env.CYNCO_PROFILE;
		invalidateCache();
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
		vi.unstubAllEnvs();
	});

	test('resolveApiKey returns flag value first', () => {
		const result = resolveApiKey('cak_flag');
		expect(result).toEqual({ key: 'cak_flag', source: 'flag' });
	});

	test('resolveApiKey returns env value second', () => {
		process.env.CYNCO_API_KEY = 'cak_env';
		const result = resolveApiKey();
		expect(result).toEqual({ key: 'cak_env', source: 'env' });
	});

	test('resolveApiKey returns null when nothing set', () => {
		const result = resolveApiKey();
		expect(result).toBeNull();
	});

	test('resolveProfileName defaults to "default"', () => {
		expect(resolveProfileName()).toBe('default');
	});

	test('resolveProfileName uses flag value', () => {
		expect(resolveProfileName('staging')).toBe('staging');
	});

	test('resolveProfileName uses env var', () => {
		process.env.CYNCO_PROFILE = 'prod';
		expect(resolveProfileName()).toBe('prod');
	});

	test('validateProfileName rejects empty', () => {
		expect(validateProfileName('')).toBe('Profile name must not be empty');
	});

	test('validateProfileName rejects special chars', () => {
		expect(validateProfileName('my profile')).toBeDefined();
	});

	test('validateProfileName accepts valid names', () => {
		expect(validateProfileName('default')).toBeUndefined();
		expect(validateProfileName('staging-2')).toBeUndefined();
		expect(validateProfileName('my_profile')).toBeUndefined();
	});

	test('maskKey masks correctly', () => {
		expect(maskKey('cak_abc123xyz')).toBe('cak_...3xyz');
		expect(maskKey('short')).toBe('sho...');
	});

	test('storeApiKey and readCredentials round-trip', () => {
		storeApiKey('cak_test123', 'myprofile');
		const creds = readCredentials();
		expect(creds?.profiles.myprofile?.api_key).toBe('cak_test123');
	});

	test('listProfiles returns stored profiles', () => {
		storeApiKey('cak_one', 'first');
		storeApiKey('cak_two', 'second');
		const profiles = listProfiles();
		expect(profiles).toHaveLength(2);
		expect(profiles.some((p) => p.name === 'first')).toBe(true);
		expect(profiles.some((p) => p.name === 'second')).toBe(true);
	});
});
