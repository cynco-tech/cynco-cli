import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockResult = { total: 2, succeeded: 2, failed: 0, results: [] };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockResult, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('journal-entries batch command', () => {
	const restore = captureTestEnv();
	let tmpFile: string;

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
		tmpFile = join(tmpdir(), `cynco-test-batch-${Date.now()}.json`);
	});
	afterEach(restore);

	test('batch creates entries from file', async () => {
		setupOutputSpies();
		const entries = [
			{ date: '2026-03-15', description: 'Entry 1', lines: [{ accountId: 'a', debit: 100 }] },
			{ date: '2026-03-16', description: 'Entry 2', lines: [{ accountId: 'b', credit: 100 }] },
		];
		writeFileSync(tmpFile, JSON.stringify(entries));

		const { batchCmd } = await import('../../../src/commands/journal-entries/batch');
		await batchCmd.parseAsync(['--file', tmpFile], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalled();
		const body = lastClient?.post.mock.calls[0][1];
		expect(body.operations).toHaveLength(2);
	});

	test('errors with empty array', async () => {
		setupOutputSpies();
		mockExitThrow();
		writeFileSync(tmpFile, '[]');

		const { batchCmd } = await import('../../../src/commands/journal-entries/batch');
		await expect(batchCmd.parseAsync(['--file', tmpFile], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});

	test('errors with invalid JSON', async () => {
		setupOutputSpies();
		mockExitThrow();
		writeFileSync(tmpFile, 'not json');

		const { batchCmd } = await import('../../../src/commands/journal-entries/batch');
		await expect(batchCmd.parseAsync(['--file', tmpFile], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
