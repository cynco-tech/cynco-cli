import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockKeys = [
	{
		id: 'key_001',
		name: 'Production',
		prefix: 'cak_prod',
		createdAt: '2026-03-01',
		lastUsedAt: '2026-03-15',
	},
	{ id: 'key_002', name: 'Staging', prefix: 'cak_stag', createdAt: '2026-03-05', lastUsedAt: null },
];

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => ({
		get: vi.fn().mockResolvedValue({
			data: {
				apiKeys: mockKeys,
				pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false },
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

describe('api-keys list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('lists api keys', async () => {
		const spies = setupOutputSpies();
		const { listApiKeysCmd } = await import('../../../src/commands/api-keys/list');
		await listApiKeysCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('key_001');
		expect(output).toContain('Production');
	});
});
