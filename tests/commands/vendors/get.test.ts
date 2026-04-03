import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockVendor = {
	id: 'vend_001',
	name: 'Supplier Co',
	email: 'sup@example.com',
	phone: '+60123',
	country: 'MY',
	createdAt: '2026-03-15',
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockVendor, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('vendors get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches vendor by id', async () => {
		setupOutputSpies();
		const { getVendorCmd } = await import('../../../src/commands/vendors/get');
		await getVendorCmd.parseAsync(['vend_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/vendors', { id: 'vend_001' });
	});
});
