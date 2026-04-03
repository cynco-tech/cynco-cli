import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockCustomer = { id: 'cust_001', name: 'Updated Corp' };

let lastClient: { patch: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn().mockResolvedValue({ data: mockCustomer, error: null, headers: null }),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('customers update command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('updates customer name', async () => {
		setupOutputSpies();
		const { updateCustomerCmd } = await import('../../../src/commands/customers/update');
		await updateCustomerCmd.parseAsync(['cust_001', '--name', 'Updated Corp'], { from: 'user' });
		expect(lastClient?.patch).toHaveBeenCalledWith('/customers', {
			id: 'cust_001',
			name: 'Updated Corp',
		});
	});

	test('updates customer email', async () => {
		setupOutputSpies();
		const { updateCustomerCmd } = await import('../../../src/commands/customers/update');
		await updateCustomerCmd.parseAsync(['cust_001', '--email', 'new@example.com'], {
			from: 'user',
		});
		expect(lastClient?.patch).toHaveBeenCalledWith('/customers', {
			id: 'cust_001',
			email: 'new@example.com',
		});
	});

	test('errors without any flags', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { updateCustomerCmd } = await import('../../../src/commands/customers/update');
		await expect(updateCustomerCmd.parseAsync(['cust_001'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
