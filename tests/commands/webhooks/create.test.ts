import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockWebhook = { id: 'wh_001', url: 'https://example.com/hook', events: ['invoice.created'] };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockWebhook, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('webhooks create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates webhook with flags', async () => {
		setupOutputSpies();
		const { createWebhookCmd } = await import('../../../src/commands/webhooks/create');
		await createWebhookCmd.parseAsync(
			['--url', 'https://example.com/hook', '--events', 'invoice.created'],
			{ from: 'user' },
		);
		expect(lastClient?.post).toHaveBeenCalledWith('/webhooks', {
			url: 'https://example.com/hook',
			events: ['invoice.created'],
		});
	});

	test('errors without --url in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createWebhookCmd } = await import('../../../src/commands/webhooks/create');
		await expect(
			createWebhookCmd.parseAsync(['--events', 'invoice.created'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});
});
