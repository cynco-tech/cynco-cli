import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	coerceSettingValue,
	flattenSettings,
	getSetting,
	isValidKey,
	readSettings,
	resetSettings,
	setSetting,
	VALID_KEYS,
	writeSettings,
} from '../../src/lib/settings';

let testDir: string;
let restoreEnv: () => void;

beforeEach(() => {
	testDir = join(
		tmpdir(),
		`cynco-settings-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	mkdirSync(testDir, { recursive: true });
	const origEnv = { ...process.env };
	process.env.XDG_CONFIG_HOME = testDir;
	restoreEnv = () => {
		process.env = origEnv;
	};
});

afterEach(() => {
	restoreEnv();
});

describe('readSettings', () => {
	test('returns empty object when settings file does not exist', () => {
		expect(readSettings()).toEqual({});
	});

	test('returns parsed settings from existing file', () => {
		const dir = join(testDir, 'cynco');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'settings.json'), '{"output":{"format":"json"}}');
		expect(readSettings()).toEqual({ output: { format: 'json' } });
	});

	test('returns empty object when settings file contains invalid JSON', () => {
		const dir = join(testDir, 'cynco');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'settings.json'), 'not json {{{');
		expect(readSettings()).toEqual({});
	});

	test('returns empty object when settings file is empty', () => {
		const dir = join(testDir, 'cynco');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'settings.json'), '');
		expect(readSettings()).toEqual({});
	});
});

describe('writeSettings', () => {
	test('creates config directory and writes settings file', () => {
		writeSettings({ output: { format: 'csv' } });
		const path = join(testDir, 'cynco', 'settings.json');
		expect(existsSync(path)).toBe(true);
		const content = JSON.parse(readFileSync(path, 'utf-8'));
		expect(content.output.format).toBe('csv');
	});

	test('overwrites existing settings file completely', () => {
		writeSettings({ output: { format: 'json' } });
		writeSettings({ defaults: { currency: 'MYR' } });
		const path = join(testDir, 'cynco', 'settings.json');
		const content = JSON.parse(readFileSync(path, 'utf-8'));
		expect(content.defaults.currency).toBe('MYR');
		expect(content.output).toBeUndefined();
	});
});

describe('getSetting', () => {
	test('returns value for existing dotted key', () => {
		writeSettings({ output: { format: 'json' } });
		expect(getSetting('output.format')).toBe('json');
	});

	test('returns undefined for non-existent key', () => {
		writeSettings({ output: { format: 'json' } });
		expect(getSetting('output.color')).toBeUndefined();
	});

	test('returns undefined for completely unknown key path', () => {
		writeSettings({});
		expect(getSetting('nonexistent.deep.path')).toBeUndefined();
	});

	test('returns entire section object for top-level key', () => {
		writeSettings({ output: { format: 'json', color: true } });
		expect(getSetting('output')).toEqual({ format: 'json', color: true });
	});
});

describe('setSetting', () => {
	test('sets a nested value creating intermediate objects', () => {
		setSetting('output.format', 'csv');
		expect(getSetting('output.format')).toBe('csv');
	});

	test('preserves existing sibling settings when setting a new key', () => {
		setSetting('output.format', 'json');
		setSetting('output.color', true);
		expect(getSetting('output.format')).toBe('json');
		expect(getSetting('output.color')).toBe(true);
	});

	test('overwrites existing value with new value', () => {
		setSetting('defaults.currency', 'MYR');
		setSetting('defaults.currency', 'USD');
		expect(getSetting('defaults.currency')).toBe('USD');
	});

	test('creates deeply nested key paths from empty settings', () => {
		setSetting('api.url', 'http://localhost:3000');
		const settings = readSettings();
		expect((settings.api as Record<string, unknown>).url).toBe('http://localhost:3000');
	});
});

describe('resetSettings', () => {
	test('removes settings file when it exists', () => {
		writeSettings({ output: { format: 'json' } });
		resetSettings();
		expect(readSettings()).toEqual({});
	});

	test('does not error when settings file does not exist', () => {
		expect(() => resetSettings()).not.toThrow();
	});
});

describe('coerceSettingValue', () => {
	test('coerces output.format to valid enum value', () => {
		expect(coerceSettingValue('output.format', 'json')).toBe('json');
		expect(coerceSettingValue('output.format', 'table')).toBe('table');
		expect(coerceSettingValue('output.format', 'csv')).toBe('csv');
	});

	test('returns undefined for invalid output.format value', () => {
		expect(coerceSettingValue('output.format', 'xml')).toBeUndefined();
	});

	test('coerces output.color to boolean', () => {
		expect(coerceSettingValue('output.color', 'true')).toBe(true);
		expect(coerceSettingValue('output.color', 'false')).toBe(false);
	});

	test('returns undefined for non-boolean output.color value', () => {
		expect(coerceSettingValue('output.color', 'yes')).toBeUndefined();
		expect(coerceSettingValue('output.color', '1')).toBeUndefined();
	});

	test('coerces api.timeout to number', () => {
		expect(coerceSettingValue('api.timeout', '30000')).toBe(30000);
		expect(coerceSettingValue('api.timeout', '0')).toBe(0);
	});

	test('returns undefined for non-numeric api.timeout', () => {
		expect(coerceSettingValue('api.timeout', 'fast')).toBeUndefined();
	});

	test('coerces defaults.limit to number', () => {
		expect(coerceSettingValue('defaults.limit', '50')).toBe(50);
	});

	test('allows negative numbers for numeric keys (no range validation)', () => {
		// Documents current behavior — negative values pass through
		expect(coerceSettingValue('defaults.limit', '-5')).toBe(-5);
	});

	test('returns string as-is for unknown keys like api.url', () => {
		expect(coerceSettingValue('api.url', 'http://localhost:3000')).toBe('http://localhost:3000');
	});

	test('returns string as-is for defaults.currency', () => {
		expect(coerceSettingValue('defaults.currency', 'MYR')).toBe('MYR');
	});
});

describe('isValidKey', () => {
	test('returns true for all VALID_KEYS', () => {
		for (const key of VALID_KEYS) {
			expect(isValidKey(key)).toBe(true);
		}
	});

	test('returns false for unknown key', () => {
		expect(isValidKey('unknown.key')).toBe(false);
		expect(isValidKey('output.theme')).toBe(false);
	});

	test('returns false for partial key match', () => {
		expect(isValidKey('output')).toBe(false);
		expect(isValidKey('format')).toBe(false);
	});
});

describe('flattenSettings', () => {
	test('returns all set values with their dotted keys', () => {
		writeSettings({ output: { format: 'json' }, defaults: { currency: 'MYR' } });
		const entries = flattenSettings();
		expect(entries).toContainEqual({ key: 'output.format', value: 'json' });
		expect(entries).toContainEqual({ key: 'defaults.currency', value: 'MYR' });
	});

	test('omits unset keys from output', () => {
		writeSettings({});
		const entries = flattenSettings();
		expect(entries).toEqual([]);
	});

	test('stringifies boolean values', () => {
		writeSettings({ output: { color: true } });
		const entries = flattenSettings();
		expect(entries).toContainEqual({ key: 'output.color', value: 'true' });
	});
});
