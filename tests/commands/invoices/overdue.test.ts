import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockOverdue = [
	{
		id: 'inv_001',
		invoiceNumber: 'INV-001',
		customerName: 'Acme',
		total: 5000,
		currency: 'MYR',
		dueDate: '2026-01-15',
		status: 'overdue',
	},
];

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => ({
		get: vi.fn().mockResolvedValue({
			data: {
				invoices: mockOverdue,
				pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
			},
			error: null,
			headers: null,
		}),
		post: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	}),
	createClient: vi.fn(),
}));

describe('invoices overdue command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('lists overdue invoices', async () => {
		const spies = setupOutputSpies();
		const { overdueCmd } = await import('../../../src/commands/invoices/overdue');
		await overdueCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('INV-001');
		expect(output).toContain('Acme');
	});
});
