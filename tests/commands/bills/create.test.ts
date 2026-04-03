import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockBill = { id: 'bill_001', billNumber: 'BILL-001', status: 'draft', total: 500 };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockBill, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bills create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates bill with --vendor-id and --items', async () => {
		setupOutputSpies();
		const items = JSON.stringify([{ description: 'Parts', quantity: 5, unitPrice: 100 }]);
		const { createBillCmd } = await import('../../../src/commands/bills/create');
		await createBillCmd.parseAsync(['--vendor-id', 'vend_001', '--items', items], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalled();
		const body = lastClient?.post.mock.calls[0][1];
		expect(body.vendorId).toBe('vend_001');
		expect(body.lineItems).toHaveLength(1);
	});

	test('errors without --vendor-id in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createBillCmd } = await import('../../../src/commands/bills/create');
		await expect(createBillCmd.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
