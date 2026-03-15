import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

let lastClientInstance: { delete: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn(),
				post: vi.fn(),
				patch: vi.fn(),
				delete: vi.fn().mockResolvedValue({
					data: { deleted: true },
					error: null,
					headers: null,
				}),
			};
			lastClientInstance = inst;
			return inst;
		},
		createClient: vi.fn(),
	};
});

describe('customers delete command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
	});

	test('deletes customer with --yes flag', async () => {
		const spies = setupOutputSpies();

		const { deleteCustomerCmd } = await import('../../../src/commands/customers/delete');
		await deleteCustomerCmd.parseAsync(['cust_abc123', '--yes'], {
			from: 'user',
		});

		// Verify client.delete was called
		expect(lastClientInstance).not.toBeNull();
		expect(lastClientInstance?.delete).toHaveBeenCalled();
		const callArgs = lastClientInstance?.delete.mock.calls[0];
		expect(callArgs[0]).toContain('cust_abc123');

		// Should have output
		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('deleted');
	});

	test('errors without --yes in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { deleteCustomerCmd } = await import('../../../src/commands/customers/delete');

		await expect(deleteCustomerCmd.parseAsync(['cust_abc123'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});

	test('includes customer ID in output', async () => {
		const spies = setupOutputSpies();

		const { deleteCustomerCmd } = await import('../../../src/commands/customers/delete');
		await deleteCustomerCmd.parseAsync(['cust_xyz789', '--yes'], {
			from: 'user',
		});

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('cust_xyz789');
	});
});
