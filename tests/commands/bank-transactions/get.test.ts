import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockTxn = {
	id: 'btx_001',
	date: '2026-03-15',
	description: 'Payment from Acme',
	amount: 1500,
	currency: 'MYR',
	type: 'credit',
	status: 'reconciled',
	accountName: 'Maybank Current',
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockTxn, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bank-transactions get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches bank transaction by id', async () => {
		setupOutputSpies();
		const { getCmd } = await import('../../../src/commands/bank-transactions/get');
		await getCmd.parseAsync(['btx_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/bank-transactions', { id: 'btx_001' });
	});
});
