import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockResult = { sent: true };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockResult, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('invoices send command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('sends an invoice', async () => {
		setupOutputSpies();
		const { sendInvoiceCmd } = await import('../../../src/commands/invoices/send-invoice');
		await sendInvoiceCmd.parseAsync(['inv_001'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/send', {});
	});

	test('sends with --email override', async () => {
		setupOutputSpies();
		const { sendInvoiceCmd } = await import('../../../src/commands/invoices/send-invoice');
		await sendInvoiceCmd.parseAsync(['inv_001', '--email', 'test@example.com'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/send', {
			email: 'test@example.com',
		});
	});
});
