import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mergeStdinWithFlags, readStdinJson } from '../../src/lib/stdin';
import { ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

vi.mock('node:fs', () => ({
	readFileSync: vi.fn(),
}));

describe('readStdinJson', () => {
	beforeEach(() => {
		setupOutputSpies();
		mockExitThrow();
	});

	test('parses valid JSON object from stdin and returns it', () => {
		vi.mocked(readFileSync).mockReturnValue('{"name": "Acme", "email": "a@b.com"}');
		const result = readStdinJson();
		expect(result).toEqual({ name: 'Acme', email: 'a@b.com' });
	});

	test('trims whitespace from stdin before parsing', () => {
		vi.mocked(readFileSync).mockReturnValue('  \n{"name": "Acme"}\n  ');
		const result = readStdinJson();
		expect(result).toEqual({ name: 'Acme' });
	});

	test('exits with error when stdin read fails (broken pipe)', () => {
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error('EAGAIN');
		});
		expect(() => readStdinJson()).toThrow(ExitError);
	});

	test('exits with error when stdin is empty string', () => {
		vi.mocked(readFileSync).mockReturnValue('   ');
		expect(() => readStdinJson()).toThrow(ExitError);
	});

	test('exits with error when stdin is a JSON array instead of object', () => {
		vi.mocked(readFileSync).mockReturnValue('[{"id":"1"}]');
		expect(() => readStdinJson()).toThrow(ExitError);
	});

	test('exits with error when stdin is a JSON primitive', () => {
		vi.mocked(readFileSync).mockReturnValue('"just a string"');
		expect(() => readStdinJson()).toThrow(ExitError);
	});

	test('exits with error when stdin is JSON null', () => {
		vi.mocked(readFileSync).mockReturnValue('null');
		expect(() => readStdinJson()).toThrow(ExitError);
	});

	test('exits with error when stdin is malformed JSON', () => {
		vi.mocked(readFileSync).mockReturnValue('{name: invalid}');
		expect(() => readStdinJson()).toThrow(ExitError);
	});

	test('passes jsonFlag to outputError so JSON errors are machine-readable', () => {
		vi.mocked(readFileSync).mockReturnValue('');
		const spies = setupOutputSpies();
		mockExitThrow();
		try {
			readStdinJson(true);
		} catch {
			// expected
		}
		// Error should be JSON-formatted because jsonFlag=true
		const errorOutput = spies.error.mock.calls.map((c) => c[0]).join('');
		expect(() => JSON.parse(errorOutput)).not.toThrow();
	});

	test('handles nested JSON objects correctly', () => {
		vi.mocked(readFileSync).mockReturnValue('{"address": {"street": "123 Main"}}');
		const result = readStdinJson();
		expect(result.address).toEqual({ street: '123 Main' });
	});

	test('handles JSON with numeric values', () => {
		vi.mocked(readFileSync).mockReturnValue('{"amount": 100.50, "quantity": 3}');
		const result = readStdinJson();
		expect(result.amount).toBe(100.5);
		expect(result.quantity).toBe(3);
	});
});

describe('mergeStdinWithFlags', () => {
	test('flags override stdin fields with same key', () => {
		const stdin = { name: 'Old Name', email: 'old@test.com' };
		const flags = { name: 'New Name' };
		const merged = mergeStdinWithFlags(stdin, flags);
		expect(merged.name).toBe('New Name');
		expect(merged.email).toBe('old@test.com');
	});

	test('undefined flag values do not override stdin fields', () => {
		const stdin = { name: 'Keep Me', email: 'keep@test.com' };
		const flags = { name: undefined, email: undefined };
		const merged = mergeStdinWithFlags(stdin, flags);
		expect(merged.name).toBe('Keep Me');
		expect(merged.email).toBe('keep@test.com');
	});

	test('null flag values do not override stdin fields', () => {
		const stdin = { name: 'Keep Me' };
		const flags = { name: null };
		const merged = mergeStdinWithFlags(stdin, flags);
		expect(merged.name).toBe('Keep Me');
	});

	test('preserves stdin fields that have no corresponding flag', () => {
		const stdin = { name: 'Acme', customField: 'special' };
		const flags = { name: 'Override' };
		const merged = mergeStdinWithFlags(stdin, flags);
		expect(merged.name).toBe('Override');
		expect(merged.customField).toBe('special');
	});

	test('adds flag fields that do not exist in stdin', () => {
		const stdin = { name: 'Acme' };
		const flags = { email: 'new@test.com' };
		const merged = mergeStdinWithFlags(stdin, flags);
		expect(merged.name).toBe('Acme');
		expect(merged.email).toBe('new@test.com');
	});

	test('does not mutate the original stdin object', () => {
		const stdin = { name: 'Original' };
		const flags = { name: 'Changed' };
		mergeStdinWithFlags(stdin, flags);
		expect(stdin.name).toBe('Original');
	});

	test('shallow merge means nested objects are fully replaced by flags', () => {
		const stdin = { config: { a: 1, b: 2 } };
		const flags = { config: { a: 99 } };
		const merged = mergeStdinWithFlags(stdin, flags);
		// Shallow merge: entire config object is replaced
		expect(merged.config).toEqual({ a: 99 });
		expect((merged.config as Record<string, unknown>).b).toBeUndefined();
	});

	test('handles empty stdin body', () => {
		const merged = mergeStdinWithFlags({}, { name: 'Test' });
		expect(merged).toEqual({ name: 'Test' });
	});

	test('handles empty flags', () => {
		const merged = mergeStdinWithFlags({ name: 'Test' }, {});
		expect(merged).toEqual({ name: 'Test' });
	});

	test('handles both empty', () => {
		const merged = mergeStdinWithFlags({}, {});
		expect(merged).toEqual({});
	});
});
