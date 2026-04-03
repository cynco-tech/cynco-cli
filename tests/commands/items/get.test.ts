import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockItem = { id: 'itm_001', name: 'Widget', unitPrice: 9.99 };

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockItem, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('items get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches item by id', async () => {
		setupOutputSpies();
		const { getItemCmd } = await import('../../../src/commands/items/get');
		await getItemCmd.parseAsync(['itm_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/items/itm_001');
	});
});
