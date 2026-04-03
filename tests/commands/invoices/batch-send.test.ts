import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: { sent: true }, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('invoices batch-send command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('sends multiple invoices', async () => {
		const spies = setupOutputSpies();
		const { batchSendCmd } = await import('../../../src/commands/invoices/batch-send');
		await batchSendCmd.parseAsync(['inv_001', 'inv_002'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledTimes(2);
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/send', {});
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_002/send', {});
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.total).toBe(2);
		expect(parsed.succeeded).toBe(2);
	});
});
