import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockItem = { id: 'itm_001', name: 'Widget', unitPrice: 9.99 };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockItem, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('items create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates item with --name and --unit-price', async () => {
		setupOutputSpies();
		const { createItemCmd } = await import('../../../src/commands/items/create');
		await createItemCmd.parseAsync(['--name', 'Widget', '--unit-price', '9.99'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/items', { name: 'Widget', unitPrice: 9.99 });
	});

	test('creates item with all options', async () => {
		setupOutputSpies();
		const { createItemCmd } = await import('../../../src/commands/items/create');
		await createItemCmd.parseAsync(
			['--name', 'Widget', '--unit-price', '9.99', '--description', 'A widget', '--tax-rate', '6'],
			{ from: 'user' },
		);
		const body = lastClient?.post.mock.calls[0][1];
		expect(body).toEqual({ name: 'Widget', unitPrice: 9.99, description: 'A widget', taxRate: 6 });
	});

	test('errors without --name in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createItemCmd } = await import('../../../src/commands/items/create');
		await expect(
			createItemCmd.parseAsync(['--unit-price', '10'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});
});
