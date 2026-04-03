import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockItems = [
	{
		id: 'itm_001',
		name: 'Widget',
		sku: 'WDG-001',
		unitPrice: 25.0,
		currency: 'MYR',
	},
	{
		id: 'itm_002',
		name: 'Gadget',
		sku: 'GDG-001',
		unitPrice: 99.5,
		currency: 'MYR',
	},
];

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => ({
		get: vi.fn().mockResolvedValue({
			data: {
				items: mockItems,
				pagination: {
					page: 1,
					limit: 20,
					total: 2,
					totalPages: 1,
					hasMore: false,
				},
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

describe('items list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('lists items', async () => {
		const spies = setupOutputSpies();
		const { listItemsCmd } = await import('../../../src/commands/items/list');
		await listItemsCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('itm_001');
		expect(output).toContain('Widget');
	});
});
