import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockItem = { id: 'itm_001', name: 'Updated Widget', unitPrice: 19.99 };

let lastClient: { patch: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn().mockResolvedValue({ data: mockItem, error: null, headers: null }),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('items update command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('updates item name', async () => {
		setupOutputSpies();
		const { updateItemCmd } = await import('../../../src/commands/items/update');
		await updateItemCmd.parseAsync(['itm_001', '--name', 'Updated Widget'], { from: 'user' });
		expect(lastClient?.patch).toHaveBeenCalledWith('/items', {
			id: 'itm_001',
			name: 'Updated Widget',
		});
	});

	test('updates item unit-price', async () => {
		setupOutputSpies();
		const { updateItemCmd } = await import('../../../src/commands/items/update');
		await updateItemCmd.parseAsync(['itm_001', '--unit-price', '19.99'], { from: 'user' });
		expect(lastClient?.patch).toHaveBeenCalledWith('/items', { id: 'itm_001', unitPrice: 19.99 });
	});
});
