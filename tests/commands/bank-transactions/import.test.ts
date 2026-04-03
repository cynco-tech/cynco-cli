import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockResult = {
	imported: 5,
	skipped: 0,
	duplicates: 1,
	dateRange: { from: '2026-03-01', to: '2026-03-31' },
};

let lastClient: { upload: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			upload: vi.fn().mockResolvedValue({ data: mockResult, error: null, headers: null }),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bank-transactions import command', () => {
	const restore = captureTestEnv();
	let tmpFile: string;

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
		tmpFile = join(tmpdir(), `cynco-test-import-${Date.now()}.csv`);
		writeFileSync(tmpFile, 'date,description,amount\n2026-03-15,Payment,1500\n');
	});
	afterEach(restore);

	test('imports transactions from CSV file', async () => {
		setupOutputSpies();
		const { importCmd } = await import('../../../src/commands/bank-transactions/import');
		await importCmd.parseAsync([tmpFile, '--account-id', 'fac_001'], { from: 'user' });
		expect(lastClient?.upload).toHaveBeenCalled();
	});

	test('errors without --account-id in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { importCmd } = await import('../../../src/commands/bank-transactions/import');
		await expect(importCmd.parseAsync([tmpFile], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
