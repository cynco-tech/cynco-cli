import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockAccount = {
	id: 'fac_001',
	name: 'Maybank Current',
	accountType: 'current',
	currency: 'MYR',
	balance: 45230,
	institutionName: 'Maybank',
	accountNumber: '512345678901',
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

describe('bank-accounts get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches bank account by id', async () => {
		setupOutputSpies();
		const { getCmd } = await import('../../../src/commands/bank-accounts/get');
		await getCmd.parseAsync(['fac_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/bank-accounts', { id: 'fac_001' });
	});
});
