import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockAccount = {
	id: 'coa_001',
	name: 'Cash',
	code: '1010',
	type: 'asset',
	normalBalance: 'debit',
	isActive: true,
	description: 'Cash and equivalents',
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockAccount, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('accounts get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches account by id', async () => {
		setupOutputSpies();
		const { getCmd } = await import('../../../src/commands/accounts/get');
		await getCmd.parseAsync(['coa_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/accounts', { id: 'coa_001' });
	});
});
