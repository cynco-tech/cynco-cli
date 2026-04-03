import pc from 'picocolors';
import { type ErrorDetail, enrichErrorDetails, formatErrorHints } from './error-hints';
import { getSetting } from './settings';

export function errorMessage(err: unknown, fallback: string): string {
	return err instanceof Error ? err.message : fallback;
}

export interface OutputOptions {
	json?: boolean;
	exitCode?: number;
}

export type OutputFormat = 'table' | 'json' | 'csv';

const VALID_OUTPUT_FORMATS: readonly OutputFormat[] = ['table', 'json', 'csv'];

export function resolveOutputFormat(opts: { json?: boolean; output?: string }): OutputFormat {
	// Explicit flags take highest priority
	if (opts.output) {
		const fmt = opts.output.toLowerCase();
		if (VALID_OUTPUT_FORMATS.includes(fmt as OutputFormat)) {
			return fmt as OutputFormat;
		}
	}
	if (opts.json) return 'json';
	if (!process.stdout.isTTY) return 'json';
	// Check persistent settings (lowest priority)
	const savedFormat = getSetting('output.format') as string | undefined;
	if (savedFormat && VALID_OUTPUT_FORMATS.includes(savedFormat as OutputFormat)) {
		return savedFormat as OutputFormat;
	}
	return 'table';
}

export function isValidOutputFormat(value: string): boolean {
	return VALID_OUTPUT_FORMATS.includes(value.toLowerCase() as OutputFormat);
}

function shouldOutputJson(json?: boolean): boolean {
	if (json) {
		return true;
	}
	if (!process.stdout.isTTY) {
		return true;
	}
	return false;
}

export function outputResult(data: unknown, opts: OutputOptions = {}): void {
	if (shouldOutputJson(opts.json)) {
		console.log(JSON.stringify(data, null, 2));
	} else {
		if (typeof data === 'string') {
			console.log(data);
		} else {
			console.log(JSON.stringify(data, null, 2));
		}
	}
	if (opts.exitCode !== undefined) {
		process.exit(opts.exitCode);
	}
}

export function outputError(
	error: {
		message: string;
		code?: string;
		requestId?: string | null;
		details?: ErrorDetail[];
	},
	opts: OutputOptions = {},
): never {
	const exitCode = opts.exitCode ?? 1;

	if (shouldOutputJson(opts.json)) {
		const errorObj: Record<string, unknown> = {
			message: error.message,
			code: error.code ?? 'unknown',
		};
		if (error.requestId) {
			errorObj.requestId = error.requestId;
		}
		if (error.details?.length) {
			errorObj.details = enrichErrorDetails(error.details);
		}
		console.error(JSON.stringify({ error: errorObj }, null, 2));
	} else {
		const reqIdSuffix = error.requestId ? pc.dim(` (request: ${error.requestId})`) : '';
		console.error(`${pc.red('Error:')} ${error.message}${reqIdSuffix}`);
		if (error.details?.length) {
			const hints = formatErrorHints(error.details);
			for (const hint of hints) {
				console.error(pc.dim(hint));
			}
		}
	}

	process.exit(exitCode);
}
