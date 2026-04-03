import pc from 'picocolors';

// NOTE: Column width calculation uses string.length, which does not account for
// double-width characters (CJK, emoji) or zero-width joiners. This is acceptable
// because CLI output currently only contains ASCII text. If we ever display
// user-generated content with wide characters, we should switch to a library
// like string-width for accurate terminal column measurement.
export type EmptyState = string | { message: string; suggestion?: string };

const COL_GAP = '  '; // 2-space gap between columns
const INDENT = '  '; // 2-space left indent

/**
 * Renders a borderless, whitespace-aligned table.
 *
 * Headers are dimmed. Columns are separated by 2 spaces.
 * Every row is indented 2 spaces from the left edge.
 * Empty/null cells render as a dim em-dash (—).
 */
export function renderTable(
	headers: string[],
	rows: string[][],
	emptyMessage: EmptyState = '(no results)',
): string {
	if (rows.length === 0) {
		if (typeof emptyMessage === 'string') {
			return `${INDENT}${pc.dim(emptyMessage)}`;
		}
		const lines = [`${INDENT}${pc.dim(emptyMessage.message)}`];
		if (emptyMessage.suggestion) {
			lines.push(`${INDENT}${pc.dim(emptyMessage.suggestion)}`);
		}
		return lines.join('\n');
	}

	const widths = headers.map((h, i) =>
		Math.max(h.length, ...rows.map((r) => stripAnsi(r[i] ?? '').length)),
	);

	const headerLine = INDENT + headers.map((h, i) => pc.dim(h.padEnd(widths[i] ?? 0))).join(COL_GAP);

	const dataLines = rows.map(
		(row) =>
			INDENT +
			row
				.map((cell, i) => {
					const content = cell || pc.dim('\u2014');
					const rawLen = stripAnsi(content).length;
					const pad = Math.max(0, (widths[i] ?? 0) - rawLen);
					return content + ' '.repeat(pad);
				})
				.join(COL_GAP),
	);

	return [headerLine, '', ...dataLines].join('\n');
}

/**
 * Renders a key-value detail view for a single resource.
 *
 * Labels are dimmed and right-padded. Values are plain text.
 * Null/undefined values render as dim em-dash.
 */
export function renderDetail(
	title: string,
	fields: Array<[label: string, value: string | number | null | undefined]>,
): string {
	const maxLabel = Math.max(...fields.map(([label]) => label.length));
	const lines: string[] = [];

	lines.push(`${INDENT}${pc.bold(title)}`);
	lines.push('');

	for (const [label, value] of fields) {
		const paddedLabel = pc.dim(label.padEnd(maxLabel));
		const display = value == null || value === '' ? pc.dim('\u2014') : String(value);
		lines.push(`${INDENT}${paddedLabel}${COL_GAP}${display}`);
	}

	return lines.join('\n');
}

/**
 * Strips ANSI escape codes from a string for accurate length measurement.
 */
function stripAnsi(str: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape sequences requires matching control chars
	return str.replace(/\x1B\[[0-9;]*m/g, '');
}
