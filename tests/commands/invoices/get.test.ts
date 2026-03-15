import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockInvoice = {
	id: 'inv_abc123',
	invoiceNumber: 'INV-001',
	customerName: 'Acme Corp',
	status: 'paid',
	total: 1500.0,
	currency: 'MYR',
	dueDate: '2026-04-01',
	createdAt: '2026-03-01',
};

let lastClientInstance: { get: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn().mockResolvedValue({
					data: mockInvoice,
					error: null,
					headers: null,
				}),
				post: vi.fn(),
				patch: vi.fn(),
				delete: vi.fn(),
			};
			lastClientInstance = inst;
			return inst;
		},
		createClient: vi.fn(),
	};
});

describe('invoices get command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
	});

	test('fetches invoice by ID', async () => {
		const spies = setupOutputSpies();

		const { getInvoiceCmd } = await import('../../../src/commands/invoices/get');
		await getInvoiceCmd.parseAsync(['inv_abc123'], { from: 'user' });

		expect(lastClientInstance).not.toBeNull();
		expect(lastClientInstance?.get).toHaveBeenCalledWith('/invoices', {
			id: 'inv_abc123',
		});
		expect(spies.log).toHaveBeenCalled();
	});

	test('JSON output contains invoice data', async () => {
		const spies = setupOutputSpies();

		const { getInvoiceCmd } = await import('../../../src/commands/invoices/get');
		await getInvoiceCmd.parseAsync(['inv_abc123'], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('inv_abc123');
		expect(output).toContain('INV-001');
		expect(output).toContain('Acme Corp');
	});

	test('includes all invoice fields in output', async () => {
		const spies = setupOutputSpies();

		const { getInvoiceCmd } = await import('../../../src/commands/invoices/get');
		await getInvoiceCmd.parseAsync(['inv_abc123'], { from: 'user' });

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('1500');
		expect(output).toContain('MYR');
	});
});
