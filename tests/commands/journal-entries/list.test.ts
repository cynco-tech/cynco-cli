import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockEntries = [
	{
		id: 'je_001',
		entryNumber: 'JE-001',
		date: '2026-03-01',
		status: 'posted',
		description: 'Revenue',
		totalDebit: 1000,
		totalCredit: 1000,
	},
	{
		id: 'je_002',
		entryNumber: 'JE-002',
		date: '2026-03-05',
		status: 'draft',
		description: 'Expense',
		totalDebit: 500,
		totalCredit: 500,
	},
];

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({
				data: {
					journalEntries: mockEntries,
					pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false },
				},
				error: null,
				headers: null,
			}),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('journal-entries list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('lists journal entries', async () => {
		const spies = setupOutputSpies();
		const { listCmd } = await import('../../../src/commands/journal-entries/list');
		await listCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('je_001');
		expect(output).toContain('JE-001');
	});

	test('passes status filter', async () => {
		setupOutputSpies();
		const { listCmd } = await import('../../../src/commands/journal-entries/list');
		await listCmd.parseAsync(['--status', 'posted'], { from: 'user' });
		expect(lastClient?.get.mock.calls[0][1]).toHaveProperty('status', 'posted');
	});
});
