import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockBankAccounts = [
	{
		id: 'fac_001',
		name: 'Main Checking',
		currency: 'MYR',
		balance: 50000,
		accountType: 'checking',
	},
];

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => ({
		get: vi.fn().mockResolvedValue({
			data: {
				bankAccounts: mockBankAccounts,
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

describe('bank-accounts list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('lists bank accounts', async () => {
		const spies = setupOutputSpies();
		const { listCmd } = await import('../../../src/commands/bank-accounts/list');
		await listCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('fac_001');
		expect(output).toContain('Main Checking');
	});
});
