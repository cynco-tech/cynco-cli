import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

let lastClient: { delete: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn().mockResolvedValue({ data: { deleted: true }, error: null, headers: null }),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bills delete command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('deletes bill with --yes', async () => {
		const spies = setupOutputSpies();
		const { deleteBillCmd } = await import('../../../src/commands/bills/delete');
		await deleteBillCmd.parseAsync(['bill_abc123', '--yes'], { from: 'user' });
		expect(lastClient?.delete).toHaveBeenCalledWith('/bills/bill_abc123');
		expect(spies.log.mock.calls.map((c) => c[0]).join('\n')).toContain('bill_abc123');
	});

	test('errors without --yes in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { deleteBillCmd } = await import('../../../src/commands/bills/delete');
		await expect(deleteBillCmd.parseAsync(['bill_abc123'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
