import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockReport = {
	type: 'trial_balance',
	period: '2026-03',
	generatedAt: '2026-03-15T10:00:00Z',
	rows: [
		{ code: '1000', name: 'Cash', debit: 50000, credit: 0 },
		{ code: '2000', name: 'Accounts Payable', debit: 0, credit: 30000 },
	],
	summary: {
		totalDebit: 50000,
		totalCredit: 30000,
	},
};

let lastClientInstance: { get: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn().mockResolvedValue({
					data: mockReport,
					error: null,
					headers: null,
				}),
				post: vi.fn(),
				patch: vi.fn(),
				delete: vi.fn(),
			};
			lastClientInstance = inst;
			return inst;
		},
		createClient: vi.fn(),
	};
});

describe('reports generate command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
	});

	test('generates report with --type flag', async () => {
		const spies = setupOutputSpies();

		const { generateReportCmd } = await import('../../../src/commands/reports/generate');
		await generateReportCmd.parseAsync(['--type', 'trial_balance', '--period', '2026-03'], {
			from: 'user',
		});

		// Verify client.get was called with correct path
		expect(lastClientInstance).not.toBeNull();
		expect(lastClientInstance?.get).toHaveBeenCalled();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[0]).toBe('/reports/trial_balance');
		expect(callArgs[1]).toHaveProperty('period', '2026-03');

		expect(spies.log).toHaveBeenCalled();
	});

	test('JSON output contains report data', async () => {
		const spies = setupOutputSpies();

		const { generateReportCmd } = await import('../../../src/commands/reports/generate');
		await generateReportCmd.parseAsync(['--type', 'trial_balance'], {
			from: 'user',
		});

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('trial_balance');
		expect(output).toContain('rows');
	});

	test('errors when --type is missing in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { generateReportCmd } = await import('../../../src/commands/reports/generate');

		await expect(generateReportCmd.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});

	test('passes date range params to client', async () => {
		const _spies = setupOutputSpies();

		const { generateReportCmd } = await import('../../../src/commands/reports/generate');
		await generateReportCmd.parseAsync(
			['--type', 'balance_sheet', '--start-date', '2026-01-01', '--end-date', '2026-03-31'],
			{ from: 'user' },
		);

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[0]).toBe('/reports/balance_sheet');
		expect(callArgs[1]).toHaveProperty('startDate', '2026-01-01');
		expect(callArgs[1]).toHaveProperty('endDate', '2026-03-31');
	});

	test('passes format param to client', async () => {
		const _spies = setupOutputSpies();

		const { generateReportCmd } = await import('../../../src/commands/reports/generate');
		await generateReportCmd.parseAsync(['--type', 'income_statement', '--format', 'csv'], {
			from: 'user',
		});

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('format', 'csv');
	});
});
