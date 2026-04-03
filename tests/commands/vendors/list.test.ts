import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockVendors = [
	{
		id: 'vend_001',
		name: 'Supplier Co',
		email: 's@example.com',
		phone: null,
		country: 'MY',
		createdAt: '2026-03-01',
	},
	{
		id: 'vend_002',
		name: 'Parts Ltd',
		email: 'p@example.com',
		phone: '+60123',
		country: 'SG',
		createdAt: '2026-03-05',
	},
];

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({
				data: {
					vendors: mockVendors,
					pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false },
				},
				error: null,
				headers: null,
			}),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('vendors list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('lists vendors', async () => {
		const spies = setupOutputSpies();
		const { listVendorsCmd } = await import('../../../src/commands/vendors/list');
		await listVendorsCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('vend_001');
		expect(output).toContain('Supplier Co');
	});

	test('passes pagination params', async () => {
		setupOutputSpies();
		const { listVendorsCmd } = await import('../../../src/commands/vendors/list');
		await listVendorsCmd.parseAsync(['--limit', '50', '--page', '3'], { from: 'user' });
		expect(lastClient?.get.mock.calls[0][1]).toHaveProperty('limit', '50');
		expect(lastClient?.get.mock.calls[0][1]).toHaveProperty('page', '3');
	});
});
