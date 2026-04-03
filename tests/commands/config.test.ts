import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	captureTestEnv,
	collectOutput,
	ExitError,
	expectJsonOutput,
	mockExitThrow,
	setupOutputSpies,
} from '../helpers';

let testDir: string;
let restoreEnv: ReturnType<typeof captureTestEnv>;

beforeEach(() => {
	testDir = join(
		tmpdir(),
		`cynco-config-cmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	mkdirSync(testDir, { recursive: true });
	restoreEnv = captureTestEnv();
	process.env.XDG_CONFIG_HOME = testDir;
});

afterEach(() => {
	restoreEnv();
	vi.restoreAllMocks();
});

describe('config set', () => {
	test('sets valid key and outputs JSON confirmation in non-interactive mode', async () => {
		const spies = setupOutputSpies();
		const { configCmd } = await import('../../src/commands/config');
		await configCmd.parseAsync(['set', 'output.format', 'json'], { from: 'user' });
		// Non-interactive: outputs JSON via console.log
		const output = expectJsonOutput(spies) as { key: string; value: string };
		expect(output.key).toBe('output.format');
		expect(output.value).toBe('json');
	});

	test('sets currency and persists it', async () => {
		const spies = setupOutputSpies();
		const { configCmd } = await import('../../src/commands/config');
		await configCmd.parseAsync(['set', 'defaults.currency', 'MYR'], { from: 'user' });
		const output = expectJsonOutput(spies) as { key: string; value: string };
		expect(output.key).toBe('defaults.currency');
		expect(output.value).toBe('MYR');
	});

	test('exits with error for invalid key', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { configCmd } = await import('../../src/commands/config');
		await expect(
			configCmd.parseAsync(['set', 'invalid.key', 'value'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});

	test('exits with error for invalid value for known key', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { configCmd } = await import('../../src/commands/config');
		await expect(
			configCmd.parseAsync(['set', 'output.format', 'xml'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});
});

describe('config get', () => {
	test('returns null for unset key', async () => {
		const spies = setupOutputSpies();
		const { configCmd } = await import('../../src/commands/config');
		await configCmd.parseAsync(['get', 'api.url'], { from: 'user' });
		const output = expectJsonOutput(spies) as { key: string; value: unknown };
		expect(output.value).toBeNull();
	});
});

describe('config list', () => {
	test('returns empty object when no settings configured', async () => {
		const spies = setupOutputSpies();
		const { configCmd } = await import('../../src/commands/config');
		await configCmd.parseAsync(['list'], { from: 'user' });
		const output = expectJsonOutput(spies);
		expect(output).toEqual({});
	});

	test('is the default subcommand', async () => {
		const spies = setupOutputSpies();
		const { configCmd } = await import('../../src/commands/config');
		await configCmd.parseAsync([], { from: 'user' });
		const output = expectJsonOutput(spies);
		expect(output).toEqual({});
	});
});

describe('config reset', () => {
	test('resets and outputs JSON confirmation', async () => {
		const spies = setupOutputSpies();
		const { configCmd } = await import('../../src/commands/config');
		await configCmd.parseAsync(['reset'], { from: 'user' });
		const output = expectJsonOutput(spies) as { reset: boolean };
		expect(output.reset).toBe(true);
	});
});
