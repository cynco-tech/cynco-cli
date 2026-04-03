import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockInvoice = {
	id: 'inv_new',
	invoiceNumber: 'INV-001',
	status: 'draft',
	total: 999,
	currency: 'MYR',
	customerName: 'Acme Corp',
	dueDate: '2026-04-15',
};

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockInvoice, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('invoices create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates invoice with --customer-id and --items', async () => {
		setupOutputSpies();
		const items = JSON.stringify([{ description: 'Widget', quantity: 10, unitPrice: 50 }]);
		const { createInvoiceCmd } = await import('../../../src/commands/invoices/create');
		await createInvoiceCmd.parseAsync(['--customer-id', 'cust_001', '--items', items], {
			from: 'user',
		});
		expect(lastClient?.post).toHaveBeenCalled();
		const body = lastClient?.post.mock.calls[0][1];
		expect(body.customerId).toBe('cust_001');
		expect(body.lineItems).toHaveLength(1);
	});

	test('creates invoice with all options', async () => {
		setupOutputSpies();
		const items = JSON.stringify([{ description: 'Widget', quantity: 5, unitPrice: 100 }]);
		const { createInvoiceCmd } = await import('../../../src/commands/invoices/create');
		await createInvoiceCmd.parseAsync(
			[
				'--customer-id',
				'cust_001',
				'--currency',
				'USD',
				'--due-date',
				'2026-04-15',
				'--memo',
				'Test memo',
				'--items',
				items,
			],
			{ from: 'user' },
		);
		const body = lastClient?.post.mock.calls[0][1];
		expect(body.currency).toBe('USD');
		expect(body.dueDate).toBe('2026-04-15');
		expect(body.memo).toBe('Test memo');
	});

	test('errors without --customer-id in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createInvoiceCmd } = await import('../../../src/commands/invoices/create');
		await expect(createInvoiceCmd.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
