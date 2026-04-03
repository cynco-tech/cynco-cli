import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

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

describe('invoices batch-void command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('voids multiple invoices with --yes', async () => {
		const spies = setupOutputSpies();
		const { batchVoidCmd } = await import('../../../src/commands/invoices/batch-void');
		await batchVoidCmd.parseAsync(['inv_001', 'inv_002', '--yes'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledTimes(2);
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/void', {});
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.total).toBe(2);
		expect(parsed.succeeded).toBe(2);
	});

	test('passes --reason to void body', async () => {
		setupOutputSpies();
		const { batchVoidCmd } = await import('../../../src/commands/invoices/batch-void');
		await batchVoidCmd.parseAsync(['inv_001', '--yes', '--reason', 'Duplicate'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/void', {
			reason: 'Duplicate',
		});
	});

	test('errors without --yes in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { batchVoidCmd } = await import('../../../src/commands/invoices/batch-void');
		await expect(batchVoidCmd.parseAsync(['inv_001'], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
