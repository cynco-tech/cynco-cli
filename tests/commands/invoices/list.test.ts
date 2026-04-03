import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockInvoices = [
	{
		id: 'inv_001',
		invoiceNumber: 'INV-001',
		customerName: 'Acme Corp',
		status: 'paid',
		total: 1500.0,
		currency: 'MYR',
		dueDate: '2026-04-01',
		createdAt: '2026-03-01',
	},
	{
		id: 'inv_002',
		invoiceNumber: 'INV-002',
		customerName: 'Beta Inc',
		status: 'draft',
		total: 800.0,
		currency: 'USD',
		dueDate: '2026-04-15',
		createdAt: '2026-03-10',
	},
];

const mockPagination = {
	page: 1,
	limit: 20,
	total: 2,
	totalPages: 1,
	hasMore: false,
};

let lastClientInstance: { get: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {
			get = vi.fn().mockResolvedValue({
				data: { invoices: mockInvoices, pagination: mockPagination },
				error: null,
				headers: null,
				pagination: mockPagination,
			});
			post = vi.fn();
			patch = vi.fn();
			delete = vi.fn();
		},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn().mockResolvedValue({
					data: { invoices: mockInvoices, pagination: mockPagination },
					error: null,
					headers: null,
					pagination: mockPagination,
				}),
				post: vi.fn(),
				patch: vi.fn(),
				delete: vi.fn(),
			};
			lastClientInstance = inst;
			return inst;
		},
		createClient: (..._args: unknown[]) => ({
			get: vi.fn().mockResolvedValue({
				data: { invoices: mockInvoices, pagination: mockPagination },
				error: null,
				headers: null,
				pagination: mockPagination,
			}),
		}),
	};
});

describe('invoices list command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('lists invoices with default pagination', async () => {
		const spies = setupOutputSpies();

		const { listInvoicesCmd } = await import('../../../src/commands/invoices/list');
		await listInvoicesCmd.parseAsync([], { from: 'user' });

		// In non-interactive mode, outputs JSON
		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('inv_001');
		expect(output).toContain('inv_002');
	});

	test('passes --limit flag to client', async () => {
		const _spies = setupOutputSpies();

		const { listInvoicesCmd } = await import('../../../src/commands/invoices/list');
		await listInvoicesCmd.parseAsync(['--limit', '50'], { from: 'user' });

		expect(lastClientInstance).not.toBeNull();
		expect(lastClientInstance?.get).toHaveBeenCalled();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[0]).toBe('/invoices');
		expect(callArgs[1]).toHaveProperty('limit', '50');
	});

	test('passes --page flag to client', async () => {
		const _spies = setupOutputSpies();

		const { listInvoicesCmd } = await import('../../../src/commands/invoices/list');
		await listInvoicesCmd.parseAsync(['--page', '3'], { from: 'user' });

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('page', '3');
	});

	test('JSON output includes invoice data', async () => {
		const spies = setupOutputSpies();

		const { listInvoicesCmd } = await import('../../../src/commands/invoices/list');
		await listInvoicesCmd.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('invoices');
		expect(output).toContain('Acme Corp');
	});

	test('passes --status filter to client', async () => {
		const _spies = setupOutputSpies();

		const { listInvoicesCmd } = await import('../../../src/commands/invoices/list');
		await listInvoicesCmd.parseAsync(['--status', 'paid'], { from: 'user' });

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('status', 'paid');
	});
});
