import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockEntry = {
	id: 'jnl_001',
	entryNumber: 'JE-001',
	date: '2026-03-15',
	status: 'draft',
	description: 'Office supplies',
};

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockEntry, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('journal-entries create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates journal entry with all flags', async () => {
		setupOutputSpies();
		const lines = JSON.stringify([
			{ accountId: 'coa_exp', debit: 500 },
			{ accountId: 'coa_cash', credit: 500 },
		]);
		const { createCmd } = await import('../../../src/commands/journal-entries/create');
		await createCmd.parseAsync(
			['--date', '2026-03-15', '--description', 'Office supplies', '--lines', lines],
			{ from: 'user' },
		);
		expect(lastClient?.post).toHaveBeenCalled();
		const body = lastClient?.post.mock.calls[0][1];
		expect(body.date).toBe('2026-03-15');
		expect(body.description).toBe('Office supplies');
		expect(body.lines).toHaveLength(2);
	});

	test('errors without --lines', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createCmd } = await import('../../../src/commands/journal-entries/create');
		await expect(
			createCmd.parseAsync(['--date', '2026-03-15', '--description', 'Test'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});

	test('errors with invalid JSON --lines', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createCmd } = await import('../../../src/commands/journal-entries/create');
		await expect(
			createCmd.parseAsync(
				['--date', '2026-03-15', '--description', 'Test', '--lines', 'not-json'],
				{ from: 'user' },
			),
		).rejects.toThrow(ExitError);
	});
});
