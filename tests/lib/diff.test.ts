import { describe, expect, test } from 'vitest';
import { computeDiff, diffToJson, renderDiff } from '../../src/lib/diff';

describe('computeDiff', () => {
	test('detects changed field when value differs', () => {
		const lines = computeDiff({ name: 'Old' }, { name: 'New' });
		expect(lines).toHaveLength(1);
		expect(lines[0]).toEqual({
			key: 'name',
			before: 'Old',
			after: 'New',
			type: 'changed',
		});
	});

	test('marks field as unchanged when value is same', () => {
		const lines = computeDiff({ name: 'Same' }, { name: 'Same' });
		expect(lines).toHaveLength(1);
		expect(lines[0].type).toBe('unchanged');
	});

	test('marks field as added when it exists only in after', () => {
		const lines = computeDiff({}, { email: 'new@test.com' });
		expect(lines).toHaveLength(1);
		expect(lines[0]).toEqual({
			key: 'email',
			before: '',
			after: 'new@test.com',
			type: 'added',
		});
	});

	test('skips fields that exist only in before (not being changed)', () => {
		const lines = computeDiff({ name: 'Old', email: 'old@test.com' }, { name: 'New' });
		expect(lines).toHaveLength(1);
		expect(lines[0].key).toBe('name');
	});

	test('handles null values in before by showing (none)', () => {
		const lines = computeDiff({ phone: null }, { phone: '+60123' });
		expect(lines).toHaveLength(1);
		expect(lines[0].before).toBe('(none)');
		expect(lines[0].after).toBe('+60123');
		expect(lines[0].type).toBe('changed');
	});

	test('handles undefined values in before as added', () => {
		const lines = computeDiff({ phone: undefined }, { phone: '+60123' });
		expect(lines).toHaveLength(1);
		expect(lines[0].type).toBe('added');
	});

	test('handles numeric values', () => {
		const lines = computeDiff({ amount: 100 }, { amount: 200 });
		expect(lines[0].before).toBe('100');
		expect(lines[0].after).toBe('200');
		expect(lines[0].type).toBe('changed');
	});

	test('handles boolean values', () => {
		const lines = computeDiff({ active: true }, { active: false });
		expect(lines[0].before).toBe('true');
		expect(lines[0].after).toBe('false');
	});

	test('handles array values by JSON stringifying', () => {
		const lines = computeDiff({ tags: ['a'] }, { tags: ['a', 'b'] });
		expect(lines[0].before).toBe('["a"]');
		expect(lines[0].after).toBe('["a","b"]');
	});

	test('returns empty array when both objects are empty', () => {
		expect(computeDiff({}, {})).toEqual([]);
	});

	test('handles multiple field changes in single call', () => {
		const lines = computeDiff(
			{ name: 'Old', email: 'old@test.com', phone: '+601' },
			{ name: 'New', email: 'old@test.com', phone: '+602' },
		);
		const changed = lines.filter((l) => l.type === 'changed');
		const unchanged = lines.filter((l) => l.type === 'unchanged');
		expect(changed).toHaveLength(2);
		expect(unchanged).toHaveLength(1);
	});
});

describe('renderDiff', () => {
	test('returns no-changes message for empty diff lines', () => {
		expect(renderDiff([])).toBe('  (no changes)\n');
	});

	test('renders changed field with arrow separator', () => {
		const lines = computeDiff({ name: 'Old' }, { name: 'New' });
		const rendered = renderDiff(lines);
		expect(rendered).toContain('name');
		expect(rendered).toContain('\u2192'); // right arrow
	});

	test('renders added field with plus prefix', () => {
		const lines = computeDiff({}, { email: 'new@test.com' });
		const rendered = renderDiff(lines);
		expect(rendered).toContain('+');
		expect(rendered).toContain('email');
	});

	test('output contains newlines for each line', () => {
		const lines = computeDiff({ a: '1', b: '2' }, { a: '3', b: '4' });
		const rendered = renderDiff(lines);
		expect(rendered.split('\n').length).toBeGreaterThanOrEqual(3); // 2 lines + trailing
	});
});

describe('diffToJson', () => {
	test('converts diff lines to JSON-serializable format', () => {
		const lines = computeDiff({ name: 'Old' }, { name: 'New' });
		const json = diffToJson(lines);
		expect(json).toHaveLength(1);
		expect(json[0]).toEqual({
			field: 'name',
			before: 'Old',
			after: 'New',
			changed: true,
		});
	});

	test('marks unchanged fields with changed: false', () => {
		const lines = computeDiff({ name: 'Same' }, { name: 'Same' });
		const json = diffToJson(lines);
		expect(json[0].changed).toBe(false);
	});

	test('returns null for before when field is newly added', () => {
		const lines = computeDiff({}, { email: 'new@test.com' });
		const json = diffToJson(lines);
		// Empty string from DiffLine.before is converted to null via || null
		expect(json[0].before).toBeNull();
		expect(json[0].changed).toBe(true);
	});

	test('returns empty array for no diff lines', () => {
		expect(diffToJson([])).toEqual([]);
	});
});
