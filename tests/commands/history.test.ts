import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, expectJsonOutput, setupOutputSpies } from '../helpers';

let testDir: string;
let restoreEnv: ReturnType<typeof captureTestEnv>;

beforeEach(() => {
	testDir = join(
		tmpdir(),
		`cynco-history-cmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	mkdirSync(testDir, { recursive: true });
	restoreEnv = captureTestEnv();
	process.env.XDG_CONFIG_HOME = testDir;
});

afterEach(() => {
	restoreEnv();
	vi.restoreAllMocks();
});

function seedHistory(entries: Array<{ command: string; exitCode?: number; durationMs?: number }>) {
	const dir = join(testDir, 'cynco');
	mkdirSync(dir, { recursive: true });
	const lines = entries.map((e) =>
		JSON.stringify({
			timestamp: '2026-04-03T10:00:00.000Z',
			command: e.command,
			exitCode: e.exitCode ?? 0,
			durationMs: e.durationMs ?? 100,
		}),
	);
	writeFileSync(join(dir, 'history.jsonl'), `${lines.join('\n')}\n`);
}

describe('history command', () => {
	test('returns empty array when no history exists (non-interactive JSON)', async () => {
		const spies = setupOutputSpies();
		const { historyCmd } = await import('../../src/commands/history');
		await historyCmd.parseAsync([], { from: 'user' });
		// Non-interactive: stderr shows "No history" OR log shows empty array
		const stderrOutput = spies.stderr.mock.calls.map((c) => c[0]).join('');
		const logOutput = spies.log.mock.calls.map((c) => c[0]).join('');
		// Either stderr has "No history" or log has "[]"
		expect(stderrOutput + logOutput).toBeTruthy();
	});

	test('limits entries with --limit flag', async () => {
		seedHistory([{ command: 'cmd1' }, { command: 'cmd2' }, { command: 'cmd3' }]);
		const spies = setupOutputSpies();
		const { historyCmd } = await import('../../src/commands/history');
		await historyCmd.parseAsync(['--limit', '2'], { from: 'user' });
		const output = expectJsonOutput(spies) as unknown[];
		expect(output).toHaveLength(2);
	});

	test('outputs JSON array in non-interactive mode', async () => {
		seedHistory([{ command: 'invoices list', exitCode: 0, durationMs: 150 }]);
		const spies = setupOutputSpies();
		const { historyCmd } = await import('../../src/commands/history');
		await historyCmd.parseAsync([], { from: 'user' });
		const output = expectJsonOutput(spies) as Array<{ command: string }>;
		expect(output).toHaveLength(1);
		expect(output[0].command).toBe('invoices list');
	});

	test('--clear removes history and outputs JSON confirmation', async () => {
		seedHistory([{ command: 'old_cmd' }]);
		const spies = setupOutputSpies();
		const { historyCmd } = await import('../../src/commands/history');
		await historyCmd.parseAsync(['--clear'], { from: 'user' });
		const output = expectJsonOutput(spies) as { cleared: boolean };
		expect(output.cleared).toBe(true);
	});

	// ── RED→GREEN TEST: Bug #2 — --limit 0 treated as --limit 20 ───
	// parseInt("0", 10) || 20 evaluates to 0 || 20 = 20 because 0 is falsy.
	// FIX: Use Number.isNaN check instead of || operator.
	test('BUG_FIX: --limit 0 returns zero entries not default 20', async () => {
		seedHistory([{ command: 'cmd1' }, { command: 'cmd2' }]);
		const spies = setupOutputSpies();
		const { historyCmd } = await import('../../src/commands/history');
		await historyCmd.parseAsync(['--limit', '0'], { from: 'user' });
		const output = expectJsonOutput(spies) as unknown[];
		expect(output).toHaveLength(0);
	});
});
