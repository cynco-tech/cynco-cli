import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockBills = [
	{
		id: 'bill_001',
		billNumber: 'BILL-001',
		vendorName: 'Supplier Co',
		status: 'draft',
		total: 500,
		currency: 'MYR',
		dueDate: '2026-04-01',
	},
	{
		id: 'bill_002',
		billNumber: 'BILL-002',
		vendorName: 'Parts Ltd',
		status: 'paid',
		total: 1200,
		currency: 'MYR',
		dueDate: '2026-03-15',
	},
];

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({
				data: {
					bills: mockBills,
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

describe('bills list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('lists bills', async () => {
		const spies = setupOutputSpies();
		const { listBillsCmd } = await import('../../../src/commands/bills/list');
		await listBillsCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('bill_001');
		expect(output).toContain('BILL-001');
	});

	test('passes status filter', async () => {
		setupOutputSpies();
		const { listBillsCmd } = await import('../../../src/commands/bills/list');
		await listBillsCmd.parseAsync(['--status', 'paid'], { from: 'user' });
		expect(lastClient?.get.mock.calls[0][1]).toHaveProperty('status', 'paid');
	});
});
