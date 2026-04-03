import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockWebhook = { id: 'wh_001', url: 'https://example.com/hook', events: ['invoice.created'] };

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockWebhook, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('webhooks get command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('fetches webhook by id', async () => {
		setupOutputSpies();
		const { getWebhookCmd } = await import('../../../src/commands/webhooks/get');
		await getWebhookCmd.parseAsync(['wh_001'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/webhooks/wh_001');
	});
});
