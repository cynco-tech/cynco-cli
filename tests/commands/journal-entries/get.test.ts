import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockEntry = {
	id: 'jnl_001',
	entryNumber: 'JE-001',
	date: '2026-03-15',
	status: 'posted',
	description: 'Office supplies',
	memo: 'March purchase',
	totalDebit: 500,
	totalCredit: 500,
	lines: [
		{ accountId: 'coa_exp', accountName: 'Expenses', debit: 500, credit: null, description: '' },
		{ accountId: 'coa_cash', accountName: 'Cash', debit: null, credit: 500, description: '' },
	],
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockEntry, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('journal-entries get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches journal entry by id', async () => {
		setupOutputSpies();
		const { getCmd } = await import('../../../src/commands/journal-entries/get');
		await getCmd.parseAsync(['jnl_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/journal-entries', { id: 'jnl_001' });
	});
});
