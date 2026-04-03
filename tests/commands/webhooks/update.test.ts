import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockWebhook = { id: 'wh_001', url: 'https://new.com/hook' };

let lastClient: { patch: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn().mockResolvedValue({ data: mockWebhook, error: null, headers: null }),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('webhooks update command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('updates webhook url', async () => {
		setupOutputSpies();
		const { updateWebhookCmd } = await import('../../../src/commands/webhooks/update');
		await updateWebhookCmd.parseAsync(['wh_001', '--url', 'https://new.com/hook'], {
			from: 'user',
		});
		expect(lastClient?.patch).toHaveBeenCalledWith('/webhooks/wh_001', {
			url: 'https://new.com/hook',
		});
	});

	test('updates webhook active state', async () => {
		setupOutputSpies();
		const { updateWebhookCmd } = await import('../../../src/commands/webhooks/update');
		await updateWebhookCmd.parseAsync(['wh_001', '--active', 'false'], { from: 'user' });
		expect(lastClient?.patch).toHaveBeenCalledWith('/webhooks/wh_001', { active: false });
	});

	test('updates webhook events', async () => {
		setupOutputSpies();
		const { updateWebhookCmd } = await import('../../../src/commands/webhooks/update');
		await updateWebhookCmd.parseAsync(['wh_001', '--events', 'invoice.created, payment.received'], {
			from: 'user',
		});
		expect(lastClient?.patch).toHaveBeenCalledWith('/webhooks/wh_001', {
			events: ['invoice.created', 'payment.received'],
		});
	});

	test('errors with invalid --active value', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { updateWebhookCmd } = await import('../../../src/commands/webhooks/update');
		await expect(
			updateWebhookCmd.parseAsync(['wh_001', '--active', 'yes'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});

	test('errors without any flags', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { updateWebhookCmd } = await import('../../../src/commands/webhooks/update');
		await expect(updateWebhookCmd.parseAsync(['wh_001'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
