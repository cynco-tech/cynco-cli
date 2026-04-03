import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockVendor = { id: 'vend_001', name: 'Updated Co' };

let lastClient: { patch: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn().mockResolvedValue({ data: mockVendor, error: null, headers: null }),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('vendors update command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('updates vendor name', async () => {
		setupOutputSpies();
		const { updateVendorCmd } = await import('../../../src/commands/vendors/update');
		await updateVendorCmd.parseAsync(['vend_001', '--name', 'Updated Co'], { from: 'user' });
		expect(lastClient?.patch).toHaveBeenCalledWith('/vendors', {
			id: 'vend_001',
			name: 'Updated Co',
		});
	});

	test('errors without any flags', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { updateVendorCmd } = await import('../../../src/commands/vendors/update');
		await expect(updateVendorCmd.parseAsync(['vend_001'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
