import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockBill = {
	id: 'bill_001',
	billNumber: 'BILL-001',
	vendorName: 'Vendor Co',
	status: 'pending',
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockBill, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bills get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches bill by id', async () => {
		setupOutputSpies();
		const { getBillCmd } = await import('../../../src/commands/bills/get');
		await getBillCmd.parseAsync(['bill_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/bills', { id: 'bill_001' });
	});
});
