import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockTransactions = [
	{
		id: 'btx_001',
		date: '2026-03-01',
		description: 'Payment received',
		amount: 1500,
		currency: 'MYR',
		status: 'categorized',
	},
	{
		id: 'btx_002',
		date: '2026-03-02',
		description: 'Office supplies',
		amount: -250,
		currency: 'MYR',
		status: 'imported',
	},
];

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({
				data: {
					bankTransactions: mockTransactions,
					pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false },
				},
				error: null,
				headers: null,
			}),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bank-transactions list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('lists bank transactions', async () => {
		const spies = setupOutputSpies();
		const { listCmd } = await import('../../../src/commands/bank-transactions/list');
		await listCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('btx_001');
		expect(output).toContain('Payment received');
	});

	test('passes account-id filter', async () => {
		setupOutputSpies();
		const { listCmd } = await import('../../../src/commands/bank-transactions/list');
		await listCmd.parseAsync(['--account-id', 'fac_abc123'], { from: 'user' });
		expect(lastClient?.get.mock.calls[0][1]).toHaveProperty('accountId', 'fac_abc123');
	});
});
