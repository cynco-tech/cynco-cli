import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockCustomer = { id: 'cust_001', name: 'Acme', email: 'acme@example.com' };

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockCustomer, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('customers get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches customer by id', async () => {
		setupOutputSpies();
		const { getCustomerCmd } = await import('../../../src/commands/customers/get');
		await getCustomerCmd.parseAsync(['cust_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/customers', { id: 'cust_001' });
	});
});
