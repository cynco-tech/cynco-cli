import { expect, vi } from 'vitest';

export class ExitError extends Error {
	code: number;
	constructor(code: number) {
		super(`process.exit(${code})`);
		this.code = code;
		this.name = 'ExitError';
	}
}

export function mockExitThrow() {
	vi.spyOn(process, 'exit').mockImplementation((code) => {
		throw new ExitError(code as number);
	});
}

export function setNonInteractive() {
	Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
	Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
}

export function captureTestEnv() {
	const origEnv = { ...process.env };
	const origStdinTTY = process.stdin.isTTY;
	const origStdoutTTY = process.stdout.isTTY;

	return function restore() {
		process.env = origEnv;
		Object.defineProperty(process.stdin, 'isTTY', {
			value: origStdinTTY,
			writable: true,
		});
		Object.defineProperty(process.stdout, 'isTTY', {
			value: origStdoutTTY,
			writable: true,
		});
	};
}

export function setupOutputSpies() {
	setNonInteractive();
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	return { log, error, stderr };
}

export async function expectExit1(fn: () => Promise<unknown>) {
	try {
		await fn();
		throw new Error('Expected process.exit(1) but it did not happen');
	} catch (err) {
		if (err instanceof ExitError) {
			if (err.code !== 1) {
				throw new Error(`Expected exit code 1, got ${err.code}`);
			}
			return;
		}
		throw err;
	}
}

// ── Mock client factory ─────────────────────────────────────────────

type MockMethod = ReturnType<typeof vi.fn>;

export interface MockClientInstance {
	get: MockMethod;
	post: MockMethod;
	patch: MockMethod;
	delete: MockMethod;
	upload: MockMethod;
}

/**
 * Creates a mock CyncoClient instance with pre-configured responses.
 * Pass method overrides to customize individual methods.
 *
 * @example
 * ```ts
 * const client = createMockClient({
 *   get: vi.fn().mockResolvedValue({ data: { invoices: [] }, error: null }),
 * });
 * ```
 */
export function createMockClient(overrides: Partial<MockClientInstance> = {}): MockClientInstance {
	return {
		get: overrides.get ?? vi.fn().mockResolvedValue({ data: null, error: null, headers: null }),
		post: overrides.post ?? vi.fn().mockResolvedValue({ data: null, error: null, headers: null }),
		patch: overrides.patch ?? vi.fn().mockResolvedValue({ data: null, error: null, headers: null }),
		delete:
			overrides.delete ?? vi.fn().mockResolvedValue({ data: null, error: null, headers: null }),
		upload:
			overrides.upload ?? vi.fn().mockResolvedValue({ data: null, error: null, headers: null }),
	};
}

/**
 * Creates a vi.mock factory object for `src/lib/client` that returns a
 * mock client from `requireClient`. Tracks the last created instance so
 * tests can assert on method calls.
 *
 * @example
 * ```ts
 * const { factory, getClient } = createClientMockFactory({
 *   get: vi.fn().mockResolvedValue({ data: { invoices: mockInvoices }, error: null }),
 * });
 * vi.mock('../../src/lib/client', () => factory);
 *
 * // after running the command:
 * expect(getClient().get).toHaveBeenCalledWith('/invoices', expect.anything());
 * ```
 */
export function createClientMockFactory(overrides: Partial<MockClientInstance> = {}) {
	let lastInstance: MockClientInstance | null = null;

	const factory = {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			lastInstance = createMockClient(overrides);
			return lastInstance;
		},
		createClient: (..._args: unknown[]) => {
			lastInstance = createMockClient(overrides);
			return lastInstance;
		},
	};

	return {
		factory,
		getClient: () => lastInstance,
	};
}

// ── Output assertion helpers ────────────────────────────────────────

type OutputSpies = ReturnType<typeof setupOutputSpies>;

/**
 * Collects all console.log output and parses as JSON.
 * Throws if output is not valid JSON.
 */
export function expectJsonOutput(spies: OutputSpies): unknown {
	expect(spies.log).toHaveBeenCalled();
	const raw = spies.log.mock.calls.map((c) => c[0]).join('\n');
	return JSON.parse(raw);
}

/**
 * Collects all console.log output as a single string.
 */
export function collectOutput(spies: OutputSpies): string {
	return spies.log.mock.calls.map((c) => c[0]).join('\n');
}

/**
 * Collects all console.error output as a single string.
 */
export function collectErrors(spies: OutputSpies): string {
	return spies.error.mock.calls.map((c) => c[0]).join(' ');
}

/**
 * Asserts that console.error output contains a substring.
 */
export function expectErrorContains(spies: OutputSpies, substring: string): void {
	const errorOutput = collectErrors(spies);
	expect(errorOutput).toContain(substring);
}

/**
 * Asserts that the JSON error output contains specific code and message substrings.
 */
export function expectJsonError(spies: OutputSpies, code: string, messageSubstring?: string): void {
	const errorOutput = collectErrors(spies);
	const parsed = JSON.parse(errorOutput) as { error: { code: string; message: string } };
	expect(parsed.error.code).toBe(code);
	if (messageSubstring) {
		expect(parsed.error.message).toContain(messageSubstring);
	}
}
