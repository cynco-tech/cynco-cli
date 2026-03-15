import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockAccounts = [
	{
		id: 'coa_001',
		code: '1000',
		name: 'Cash',
		type: 'asset',
		normalBalance: 'debit',
		isActive: true,
		description: 'Cash and cash equivalents',
		createdAt: '2026-01-01',
	},
	{
		id: 'coa_002',
		code: '2000',
		name: 'Accounts Payable',
		type: 'liability',
		normalBalance: 'credit',
		isActive: true,
		description: 'Trade payables',
		createdAt: '2026-01-01',
	},
	{
		id: 'coa_003',
		code: '4000',
		name: 'Revenue',
		type: 'revenue',
		normalBalance: 'credit',
		isActive: false,
		description: 'Operating revenue',
		createdAt: '2026-01-01',
	},
];

const mockPagination = {
	page: 1,
	limit: 20,
	total: 3,
	totalPages: 1,
	hasMore: false,
};

let lastClientInstance: { get: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn().mockResolvedValue({
					data: { accounts: mockAccounts, pagination: mockPagination },
					error: null,
					headers: null,
					pagination: mockPagination,
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

describe('accounts list command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
	});

	test('lists accounts', async () => {
		const spies = setupOutputSpies();

		const { listCmd } = await import('../../../src/commands/accounts/list');
		await listCmd.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('coa_001');
		expect(output).toContain('coa_002');
		expect(output).toContain('coa_003');
	});

	test('JSON output includes account data', async () => {
		const spies = setupOutputSpies();

		const { listCmd } = await import('../../../src/commands/accounts/list');
		await listCmd.parseAsync([], { from: 'user' });

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('Cash');
		expect(output).toContain('Accounts Payable');
		expect(output).toContain('Revenue');
	});

	test('passes --type filter to client', async () => {
		const _spies = setupOutputSpies();

		const { listCmd } = await import('../../../src/commands/accounts/list');
		await listCmd.parseAsync(['--type', 'asset'], { from: 'user' });

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('type', 'asset');
	});

	test('passes --active-only filter to client', async () => {
		const _spies = setupOutputSpies();

		const { listCmd } = await import('../../../src/commands/accounts/list');
		await listCmd.parseAsync(['--active-only'], { from: 'user' });

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('activeOnly', 'true');
	});

	test('passes pagination params to client', async () => {
		const _spies = setupOutputSpies();

		const { listCmd } = await import('../../../src/commands/accounts/list');
		await listCmd.parseAsync(['--limit', '50', '--page', '2'], {
			from: 'user',
		});

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('limit', '50');
		expect(callArgs[1]).toHaveProperty('page', '2');
	});
});
