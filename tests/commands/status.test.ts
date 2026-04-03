import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

const mockBankAccounts = {
	bankAccounts: [
		{ id: 'fac_001', name: 'Maybank', currency: 'MYR', balance: 45230 },
		{ id: 'fac_002', name: 'HSBC', currency: 'USD', balance: 12100 },
	],
};

const mockOverdue = {
	invoices: [
		{
			id: 'inv_042',
			invoiceNumber: 'INV-042',
			customerName: 'Acme Corp',
			total: 5000,
			currency: 'MYR',
			dueDate: '2026-03-01',
		},
	],
};

const mockPending = {
	bills: [
		{
			id: 'bill_019',
			billNumber: 'BILL-019',
			vendorName: 'Vendor A',
			total: 1500,
			currency: 'MYR',
			dueDate: '2026-04-10',
		},
	],
};

vi.mock('../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => ({
		get: vi.fn().mockImplementation((path: string) => {
			if (path === '/bank-accounts')
				return Promise.resolve({ data: mockBankAccounts, error: null });
			if (path === '/invoices') return Promise.resolve({ data: mockOverdue, error: null });
			if (path === '/bills') return Promise.resolve({ data: mockPending, error: null });
			return Promise.resolve({ data: null, error: null });
		}),
		post: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	}),
	createClient: vi.fn(),
}));

describe('status command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('outputs status as JSON in non-interactive mode', async () => {
		const spies = setupOutputSpies();
		const { statusCmd } = await import('../../src/commands/status');
		await statusCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.cash).toBeDefined();
		expect(parsed.cash.accounts).toHaveLength(2);
		expect(parsed.overdue).toBeDefined();
		expect(parsed.overdue.invoices).toHaveLength(1);
		expect(parsed.upcoming).toBeDefined();
		expect(parsed.upcoming.bills).toHaveLength(1);
	});

	test('structures data correctly with totals', async () => {
		const spies = setupOutputSpies();
		const { statusCmd } = await import('../../src/commands/status');
		await statusCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		// Cash totals grouped by currency
		expect(parsed.cash.totals.MYR).toBe(45230);
		expect(parsed.cash.totals.USD).toBe(12100);
		// Overdue total
		expect(parsed.overdue.total).toBe(5000);
		// Upcoming total
		expect(parsed.upcoming.total).toBe(1500);
	});
});
