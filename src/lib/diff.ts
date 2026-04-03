import pc from 'picocolors';

type DiffLine = {
	key: string;
	before: string;
	after: string;
	type: 'changed' | 'added' | 'unchanged';
};

/**
 * Computes a shallow diff between two objects, showing what fields changed.
 */
export function computeDiff(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
): DiffLine[] {
	const lines: DiffLine[] = [];
	const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

	for (const key of allKeys) {
		const beforeVal = before[key];
		const afterVal = after[key];

		// Skip fields not being changed
		if (afterVal === undefined) continue;

		const beforeStr = formatValue(beforeVal);
		const afterStr = formatValue(afterVal);

		if (beforeVal === undefined) {
			lines.push({ key, before: '', after: afterStr, type: 'added' });
		} else if (beforeStr !== afterStr) {
			lines.push({ key, before: beforeStr, after: afterStr, type: 'changed' });
		} else {
			lines.push({ key, before: beforeStr, after: afterStr, type: 'unchanged' });
		}
	}

	return lines;
}

/**
 * Renders a colored diff to a string for stderr output.
 */
export function renderDiff(lines: DiffLine[]): string {
	if (lines.length === 0) return '  (no changes)\n';

	const maxKeyLen = Math.max(...lines.map((l) => l.key.length));
	const parts: string[] = [];

	for (const line of lines) {
		const paddedKey = line.key.padEnd(maxKeyLen);
		switch (line.type) {
			case 'changed':
				parts.push(
					`  ${pc.dim(paddedKey)}  ${pc.red(line.before)} ${pc.dim('\u2192')} ${pc.green(line.after)}\n`,
				);
				break;
			case 'added':
				parts.push(`  ${pc.green('+')} ${paddedKey}  ${pc.green(line.after)}\n`);
				break;
			case 'unchanged':
				parts.push(`  ${pc.dim(paddedKey)}  ${pc.dim(line.before)}\n`);
				break;
		}
	}

	return parts.join('');
}

/**
 * Returns a JSON-serializable diff representation.
 */
export function diffToJson(lines: DiffLine[]): Array<{
	field: string;
	before: unknown;
	after: unknown;
	changed: boolean;
}> {
	return lines.map((l) => ({
		field: l.key,
		before: l.before || null,
		after: l.after,
		changed: l.type !== 'unchanged',
	}));
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return '(none)';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) return JSON.stringify(value);
	return JSON.stringify(value);
}
