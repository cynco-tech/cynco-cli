import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockInvoice = { id: 'inv_001', status: 'finalized' };

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockInvoice, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('invoices finalize command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('finalizes an invoice', async () => {
		const spies = setupOutputSpies();
		const { finalizeCmd } = await import('../../../src/commands/invoices/finalize');
		await finalizeCmd.parseAsync(['inv_001'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/finalize', {});
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('inv_001');
		expect(output).toContain('finalized');
	});
});
