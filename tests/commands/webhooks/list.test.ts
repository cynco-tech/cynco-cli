import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockWebhooks = [
	{
		id: 'wh_001',
		url: 'https://example.com/hook',
		active: true,
		events: ['invoice.paid'],
		createdAt: '2026-03-01',
	},
];

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => ({
		get: vi.fn().mockResolvedValue({
			data: {
				webhooks: mockWebhooks,
				pagination: {
					page: 1,
					limit: 20,
					total: 1,
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

describe('webhooks list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('lists webhooks', async () => {
		const spies = setupOutputSpies();
		const { listWebhooksCmd } = await import('../../../src/commands/webhooks/list');
		await listWebhooksCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('wh_001');
		expect(output).toContain('https://example.com/hook');
	});
});
