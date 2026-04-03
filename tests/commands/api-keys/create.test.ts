import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockApiKey = {
	id: 'api_001',
	name: 'CI/CD',
	key: 'cak_live_abc123',
	scopes: ['invoices:read', 'customers:read'],
};

let lastClient: { post: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn().mockResolvedValue({ data: mockApiKey, error: null, headers: null }),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('api-keys create command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('creates api key with flags', async () => {
		setupOutputSpies();
		const { createApiKeyCmd } = await import('../../../src/commands/api-keys/create');
		await createApiKeyCmd.parseAsync(
			['--name', 'CI/CD', '--scopes', 'invoices:read,customers:read'],
			{
				from: 'user',
			},
		);
		expect(lastClient?.post).toHaveBeenCalledWith('/api-keys', {
			name: 'CI/CD',
			scopes: ['invoices:read', 'customers:read'],
		});
	});

	test('errors without --name in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createApiKeyCmd } = await import('../../../src/commands/api-keys/create');
		await expect(
			createApiKeyCmd.parseAsync(['--scopes', 'invoices:read'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});

	test('errors with invalid scope', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { createApiKeyCmd } = await import('../../../src/commands/api-keys/create');
		await expect(
			createApiKeyCmd.parseAsync(['--name', 'Bad', '--scopes', 'invalid_scope'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});
});
