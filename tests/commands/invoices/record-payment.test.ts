import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockPayment = {
	invoiceId: 'inv_001',
	amount: 500,
	currency: 'MYR',
	date: '2026-03-15',
	method: 'bank_transfer',
};

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockPayment, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('invoices record-payment command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('records a payment with --amount', async () => {
		setupOutputSpies();
		const { recordPaymentCmd } = await import('../../../src/commands/invoices/record-payment');
		await recordPaymentCmd.parseAsync(['inv_001', '--amount', '500'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/payments', { amount: 500 });
	});

	test('records with all options', async () => {
		setupOutputSpies();
		const { recordPaymentCmd } = await import('../../../src/commands/invoices/record-payment');
		await recordPaymentCmd.parseAsync(
			['inv_001', '--amount', '500', '--date', '2026-03-15', '--method', 'bank_transfer'],
			{ from: 'user' },
		);
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/payments', {
			amount: 500,
			date: '2026-03-15',
			method: 'bank_transfer',
		});
	});

	test('errors without --amount in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { recordPaymentCmd } = await import('../../../src/commands/invoices/record-payment');
		await expect(recordPaymentCmd.parseAsync(['inv_001'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
