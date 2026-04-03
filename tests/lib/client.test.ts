import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

// Mock config so tests don't read the real ~/.config/cynco/credentials.json
vi.mock('../../src/lib/config', () => ({
	resolveApiKey: vi.fn((flagValue?: string) => {
		if (flagValue) return { key: flagValue, source: 'flag' as const };
		const envKey = process.env.CYNCO_API_KEY;
		if (envKey) return { key: envKey, source: 'env' as const };
		return null;
	}),
	listProfiles: vi.fn(() => []),
}));

describe('CyncoClient', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('request sends correct method, headers, and URL', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { id: 'test_1' } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_my_key', 'https://api.test.io');

		await client.request('GET', '/invoices');

		expect(mockFetch).toHaveBeenCalledOnce();
		const [url, opts] = mockFetch.mock.calls[0];
		expect(url).toBe('https://api.test.io/api/v1/invoices');
		expect(opts.method).toBe('GET');
		expect(opts.headers.Authorization).toBe('Bearer cak_my_key');
		expect(opts.headers['User-Agent']).toMatch(/^cynco-cli\//);
	});

	test('request appends query params', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: [] }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		await client.request('GET', '/invoices', undefined, {
			page: '2',
			limit: '10',
		});

		const [url] = mockFetch.mock.calls[0];
		expect(url).toContain('page=2');
		expect(url).toContain('limit=10');
	});

	test('request skips empty or undefined params', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: [] }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		await client.request('GET', '/invoices', undefined, {
			page: '1',
			status: '',
		});

		const [url] = mockFetch.mock.calls[0];
		expect(url).toContain('page=1');
		expect(url).not.toContain('status');
	});

	test('request sets Content-Type only when body is present', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: {} }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		// GET request - no body, no Content-Type
		await client.request('GET', '/invoices');
		const getOpts = mockFetch.mock.calls[0][1];
		expect(getOpts.headers['Content-Type']).toBeUndefined();
		expect(getOpts.body).toBeUndefined();

		// POST request - with body, Content-Type set
		await client.request('POST', '/invoices', { name: 'Test' });
		const postOpts = mockFetch.mock.calls[1][1];
		expect(postOpts.headers['Content-Type']).toBe('application/json');
		expect(postOpts.body).toBe(JSON.stringify({ name: 'Test' }));
	});

	test('request parses successful response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: true,
				data: { id: 'inv_123', total: 100 },
				pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
			}),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		const result = await client.get<{ id: string; total: number }>('/invoices');

		expect(result.data).toEqual({ id: 'inv_123', total: 100 });
		expect(result.error).toBeNull();
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 1,
			totalPages: 1,
			hasMore: false,
		});
	});

	test('request parses error response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: false,
				error: { code: 'not_found', message: 'Invoice not found' },
			}),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		const result = await client.get<unknown>('/invoices/missing');

		expect(result.data).toBeNull();
		expect(result.error).toEqual({
			message: 'Invoice not found',
			code: 'not_found',
		});
	});

	test('request extracts retry-after header', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({
				success: false,
				error: { code: 'RATE_LIMITED', message: 'Too many requests' },
			}),
			headers: new Headers({ 'retry-after': '5' }),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		const result = await client.get<unknown>('/invoices');

		expect(result.headers).toEqual({ 'retry-after': '5' });
	});

	test('request returns null headers when no retry-after', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: {} }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		const result = await client.get<unknown>('/invoices');

		expect(result.headers).toBeNull();
	});

	test('convenience method get calls request with GET', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { id: '1' } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		await client.get('/test', { q: 'search' });

		expect(mockFetch.mock.calls[0][1].method).toBe('GET');
		expect(mockFetch.mock.calls[0][0]).toContain('q=search');
	});

	test('convenience method post calls request with POST and body', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { id: '1' } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		await client.post('/test', { name: 'New' });

		expect(mockFetch.mock.calls[0][1].method).toBe('POST');
		expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'New' }));
	});

	test('convenience method patch calls request with PATCH and body', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { id: '1' } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		await client.patch('/test', { name: 'Updated' });

		expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
		expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'Updated' }));
	});

	test('convenience method delete calls request with DELETE', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { deleted: true } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		await client.delete('/test/1');

		expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
	});

	test('request uses CYNCO_API_URL env when no baseUrl provided', async () => {
		process.env.CYNCO_API_URL = 'https://custom.api.io';

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: {} }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key');

		await client.get('/test');

		expect(mockFetch.mock.calls[0][0]).toContain('https://custom.api.io');
	});

	test('request uses default base URL when no env or explicit baseUrl', async () => {
		delete process.env.CYNCO_API_URL;

		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: {} }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key');

		await client.get('/test');

		expect(mockFetch.mock.calls[0][0]).toContain('https://app.cynco.io');
	});

	test('request returns null pagination when not in response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: async () => ({ success: true, data: { id: '1' } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', mockFetch);

		const { CyncoClient } = await import('../../src/lib/client');
		const client = new CyncoClient('cak_key', 'https://api.test.io');

		const result = await client.get<unknown>('/test');

		expect(result.pagination).toBeNull();
	});
});

describe('requireClient', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns a CyncoClient when API key is available', async () => {
		const { requireClient, CyncoClient } = await import('../../src/lib/client');
		const client = requireClient({ apiKey: 'cak_test_key' });
		expect(client).toBeInstanceOf(CyncoClient);
	});

	test('exits with error when no API key available', async () => {
		setupOutputSpies();
		mockExitThrow();
		delete process.env.CYNCO_API_KEY;

		const { requireClient } = await import('../../src/lib/client');

		expect(() => requireClient({})).toThrow(ExitError);
	});
});

describe('createClient', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('creates client with env key', async () => {
		const { createClient, CyncoClient } = await import('../../src/lib/client');
		const client = createClient();
		expect(client).toBeInstanceOf(CyncoClient);
	});

	test('throws when no API key available', async () => {
		delete process.env.CYNCO_API_KEY;
		const { createClient } = await import('../../src/lib/client');
		expect(() => createClient()).toThrow('No API key found');
	});
});
