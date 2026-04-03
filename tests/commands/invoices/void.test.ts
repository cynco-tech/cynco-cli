import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockInvoice = { id: 'inv_001', status: 'void' };

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

describe('invoices void command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('voids an invoice with --yes', async () => {
		const spies = setupOutputSpies();
		const { voidCmd } = await import('../../../src/commands/invoices/void');
		await voidCmd.parseAsync(['inv_001', '--yes'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/void', {});
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('inv_001');
	});

	test('voids with --reason', async () => {
		setupOutputSpies();
		const { voidCmd } = await import('../../../src/commands/invoices/void');
		await voidCmd.parseAsync(['inv_001', '--yes', '--reason', 'Duplicate'], { from: 'user' });
		expect(lastClient?.post).toHaveBeenCalledWith('/invoices/inv_001/void', {
			reason: 'Duplicate',
		});
	});

	test('errors without --yes in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { voidCmd } = await import('../../../src/commands/invoices/void');
		await expect(voidCmd.parseAsync(['inv_001'], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
