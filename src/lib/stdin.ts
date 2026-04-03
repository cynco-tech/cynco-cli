import { readFileSync } from 'node:fs';
import { outputError } from './output';

/**
 * Reads JSON from stdin synchronously.
 * Returns the parsed object, or calls outputError (exits) on failure.
 */
export function readStdinJson(jsonFlag?: boolean): Record<string, unknown> {
	let raw: string;
	try {
		raw = readFileSync(0, 'utf-8').trim();
	} catch {
		outputError({ message: 'Failed to read from stdin', code: 'stdin_error' }, { json: jsonFlag });
	}

	if (!raw) {
		outputError(
			{
				message: 'No data received on stdin. Pipe a JSON body or omit --stdin.',
				code: 'stdin_empty',
			},
			{ json: jsonFlag },
		);
	}

	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			outputError(
				{ message: 'stdin must be a JSON object, not an array or primitive', code: 'invalid_json' },
				{ json: jsonFlag },
			);
		}
		return parsed as Record<string, unknown>;
	} catch {
		outputError(
			{ message: 'Invalid JSON on stdin. Ensure the input is valid JSON.', code: 'invalid_json' },
			{ json: jsonFlag },
		);
	}
}

/**
 * Checks if stdin has piped data available (not a TTY).
 */
export function hasStdinData(): boolean {
	return !process.stdin.isTTY;
}

/**
 * Merges stdin JSON body with explicit CLI flag values.
 * Flags take precedence over stdin fields (shallow merge).
 * Undefined/null flag values are skipped (don't override stdin).
 */
export function mergeStdinWithFlags(
	stdinBody: Record<string, unknown>,
	flags: Record<string, unknown>,
): Record<string, unknown> {
	const merged = { ...stdinBody };
	for (const [key, value] of Object.entries(flags)) {
		if (value !== undefined && value !== null) {
			merged[key] = value;
		}
	}
	return merged;
}
