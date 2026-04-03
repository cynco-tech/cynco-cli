import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

let lastClient: { patch: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn().mockResolvedValue({
				data: { id: 'bill_abc123', status: 'finalized' },
				error: null,
				headers: null,
			}),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('bills update command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('updates bill status', async () => {
		setupOutputSpies();
		const { updateBillCmd } = await import('../../../src/commands/bills/update');
		await updateBillCmd.parseAsync(['bill_abc123', '--status', 'finalized'], { from: 'user' });
		expect(lastClient?.patch).toHaveBeenCalledWith('/bills', {
			id: 'bill_abc123',
			status: 'finalized',
		});
	});

	test('errors when no fields provided', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { updateBillCmd } = await import('../../../src/commands/bills/update');
		await expect(updateBillCmd.parseAsync(['bill_abc123'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
