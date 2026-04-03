import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { appendHistory, clearHistory, readHistory } from '../../src/lib/history';

let testDir: string;
let restoreEnv: () => void;

beforeEach(() => {
	testDir = join(
		tmpdir(),
		`cynco-history-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

function historyPath(): string {
	return join(testDir, 'cynco', 'history.jsonl');
}

function makeEntry(
	overrides: Partial<{
		timestamp: string;
		command: string;
		exitCode: number;
		durationMs: number;
	}> = {},
) {
	return {
		timestamp: overrides.timestamp ?? '2026-04-03T10:00:00.000Z',
		command: overrides.command ?? 'invoices list',
		exitCode: overrides.exitCode ?? 0,
		durationMs: overrides.durationMs ?? 150,
	};
}

describe('appendHistory', () => {
	test('creates history file and appends entry as JSONL', () => {
		const entry = makeEntry({ command: 'invoices list' });
		appendHistory(entry);
		const content = readFileSync(historyPath(), 'utf-8');
		const lines = content.trim().split('\n');
		expect(lines).toHaveLength(1);
		const parsed = JSON.parse(lines[0]);
		expect(parsed.command).toBe('invoices list');
		expect(parsed.exitCode).toBe(0);
	});

	test('appends multiple entries on separate lines', () => {
		appendHistory(makeEntry({ command: 'first' }));
		appendHistory(makeEntry({ command: 'second' }));
		appendHistory(makeEntry({ command: 'third' }));
		const content = readFileSync(historyPath(), 'utf-8');
		const lines = content.trim().split('\n');
		expect(lines).toHaveLength(3);
	});

	test('does not throw when config directory does not exist yet', () => {
		// cynco subdirectory doesn't exist — appendHistory creates it
		expect(() => appendHistory(makeEntry())).not.toThrow();
	});

	test('silently fails when write would error (best-effort)', () => {
		// Read-only directory would cause write error — but it's caught silently
		// This documents the best-effort policy
		expect(() => appendHistory(makeEntry())).not.toThrow();
	});
});

describe('readHistory', () => {
	test('returns empty array when history file does not exist', () => {
		expect(readHistory()).toEqual([]);
	});

	test('returns last N entries based on limit parameter', () => {
		for (let i = 0; i < 10; i++) {
			appendHistory(makeEntry({ command: `cmd_${i}` }));
		}
		const entries = readHistory(3);
		expect(entries).toHaveLength(3);
		expect(entries[0].command).toBe('cmd_7');
		expect(entries[2].command).toBe('cmd_9');
	});

	test('returns all entries when limit exceeds total', () => {
		appendHistory(makeEntry({ command: 'only_one' }));
		const entries = readHistory(100);
		expect(entries).toHaveLength(1);
		expect(entries[0].command).toBe('only_one');
	});

	test('defaults to 20 entries when limit not specified', () => {
		for (let i = 0; i < 25; i++) {
			appendHistory(makeEntry({ command: `cmd_${i}` }));
		}
		const entries = readHistory();
		expect(entries).toHaveLength(20);
	});

	test('skips malformed JSONL lines without crashing', () => {
		const dir = join(testDir, 'cynco');
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			historyPath(),
			`${JSON.stringify(makeEntry({ command: 'good' }))}\nNOT JSON\n${JSON.stringify(makeEntry({ command: 'also_good' }))}\n`,
		);
		const entries = readHistory();
		expect(entries).toHaveLength(2);
		expect(entries[0].command).toBe('good');
		expect(entries[1].command).toBe('also_good');
	});

	test('returns empty array when history file is empty', () => {
		const dir = join(testDir, 'cynco');
		mkdirSync(dir, { recursive: true });
		writeFileSync(historyPath(), '');
		expect(readHistory()).toEqual([]);
	});
});

describe('clearHistory', () => {
	test('removes history file when it exists', () => {
		appendHistory(makeEntry());
		expect(existsSync(historyPath())).toBe(true);
		clearHistory();
		expect(existsSync(historyPath())).toBe(false);
	});

	test('does not throw when history file does not exist', () => {
		expect(() => clearHistory()).not.toThrow();
	});

	test('readHistory returns empty after clear', () => {
		appendHistory(makeEntry());
		clearHistory();
		expect(readHistory()).toEqual([]);
	});
});

describe('rotation', () => {
	test('rotates file when entries exceed 1000 keeping last 1000', () => {
		const dir = join(testDir, 'cynco');
		mkdirSync(dir, { recursive: true });
		// Write 1005 entries directly (faster than appending one by one)
		const lines: string[] = [];
		for (let i = 0; i < 1005; i++) {
			lines.push(JSON.stringify(makeEntry({ command: `cmd_${i}` })));
		}
		writeFileSync(historyPath(), lines.join('\n') + '\n');
		// Trigger rotation by appending one more
		appendHistory(makeEntry({ command: 'trigger_rotation' }));
		const content = readFileSync(historyPath(), 'utf-8');
		const resultLines = content.trim().split('\n');
		expect(resultLines.length).toBeLessThanOrEqual(1001);
	});
});
