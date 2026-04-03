import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: {}, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('invoices batch-finalize command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('finalizes multiple invoices', async () => {
		const spies = setupOutputSpies();
		const { batchFinalizeCmd } = await import('../../../src/commands/invoices/batch-finalize');
		await batchFinalizeCmd.parseAsync(['inv_001', 'inv_002', 'inv_003'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledTimes(3);
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.total).toBe(3);
		expect(parsed.succeeded).toBe(3);
	});
});
