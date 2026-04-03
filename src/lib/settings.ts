import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from './config';

export type Settings = {
	output?: {
		format?: 'table' | 'json' | 'csv';
		color?: boolean;
	};
	api?: {
		url?: string;
		timeout?: number;
	};
	defaults?: {
		currency?: string;
		limit?: number;
	};
};

function getSettingsPath(): string {
	return join(getConfigDir(), 'settings.json');
}

export function readSettings(): Settings {
	const path = getSettingsPath();
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, 'utf-8')) as Settings;
	} catch {
		return {};
	}
}

export function writeSettings(settings: Settings): void {
	const dir = getConfigDir();
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true, mode: 0o700 });
	}
	writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

export function resetSettings(): void {
	const path = getSettingsPath();
	if (existsSync(path)) {
		unlinkSync(path);
	}
}

/**
 * Gets a nested value from settings using dot notation.
 * e.g. getSetting('output.format') → 'json'
 */
export function getSetting(key: string): unknown {
	const settings = readSettings();
	const parts = key.split('.');
	let current: unknown = settings;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * Sets a nested value in settings using dot notation.
 * e.g. setSetting('output.format', 'json')
 */
export function setSetting(key: string, value: unknown): void {
	const settings = readSettings();
	const parts = key.split('.');
	const lastPart = parts[parts.length - 1] as string;
	let current: Record<string, unknown> = settings as Record<string, unknown>;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i] as string;
		if (current[part] === undefined || typeof current[part] !== 'object') {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	current[lastPart] = value;
	writeSettings(settings);
}

/**
 * Coerces string values to appropriate types for known settings.
 */
export function coerceSettingValue(key: string, raw: string): unknown {
	const numberKeys = ['api.timeout', 'defaults.limit'];
	const boolKeys = ['output.color'];
	const enumKeys: Record<string, string[]> = {
		'output.format': ['table', 'json', 'csv'],
	};

	if (numberKeys.includes(key)) {
		const n = Number(raw);
		if (Number.isNaN(n)) return undefined;
		return n;
	}
	if (boolKeys.includes(key)) {
		if (raw === 'true') return true;
		if (raw === 'false') return false;
		return undefined;
	}
	if (enumKeys[key]) {
		if (!enumKeys[key].includes(raw)) return undefined;
		return raw;
	}
	return raw;
}

/** All valid setting keys. */
export const VALID_KEYS = [
	'output.format',
	'output.color',
	'api.url',
	'api.timeout',
	'defaults.currency',
	'defaults.limit',
] as const;

export function isValidKey(key: string): boolean {
	return (VALID_KEYS as readonly string[]).includes(key);
}

/**
 * Flattens settings to a list of key-value pairs for display.
 */
export function flattenSettings(): Array<{ key: string; value: string }> {
	const result: Array<{ key: string; value: string }> = [];
	for (const key of VALID_KEYS) {
		const val = getSetting(key);
		if (val !== undefined) {
			result.push({ key, value: String(val) });
		}
	}
	return result;
}
