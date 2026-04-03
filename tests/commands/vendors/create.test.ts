import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockVendor = { id: 'vend_001', name: 'Supplier Co', email: 'sup@example.com' };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockVendor, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('vendors create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates vendor with --name', async () => {
		setupOutputSpies();
		const { createVendorCmd } = await import('../../../src/commands/vendors/create');
		await createVendorCmd.parseAsync(['--name', 'Supplier Co'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/vendors', { name: 'Supplier Co' });
	});

	test('creates vendor with all flags', async () => {
		setupOutputSpies();
		const { createVendorCmd } = await import('../../../src/commands/vendors/create');
		await createVendorCmd.parseAsync(
			[
				'--name',
				'Supplier Co',
				'--email',
				'sup@example.com',
				'--phone',
				'+60123',
				'--country',
				'MY',
			],
			{ from: 'user' },
		);
		expect(lastClient?.post).toHaveBeenCalledWith('/vendors', {
			name: 'Supplier Co',
			email: 'sup@example.com',
			phone: '+60123',
			country: 'MY',
		});
	});

	test('errors without --name in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createVendorCmd } = await import('../../../src/commands/vendors/create');
		await expect(createVendorCmd.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
