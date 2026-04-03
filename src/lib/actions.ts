import pc from 'picocolors';
import type { CyncoClient, GlobalOpts } from './client';
import { requireClient } from './client';
import { toCsv } from './csv';
import { computeDiff, diffToJson, renderDiff } from './diff';
import { outputResult, resolveOutputFormat } from './output';
import { confirmDelete } from './prompts';
import { withSpinner } from './spinner';
import { isInteractive } from './tty';

type ApiCall<T> = (client: CyncoClient) => Promise<{
	data: T | null;
	error: { message: string; code?: string } | null;
	headers?: Record<string, string> | null;
}>;
type SpinnerMessages = { loading: string; success: string; fail: string };

async function runAction<T>(
	config: {
		spinner: SpinnerMessages;
		apiCall: ApiCall<T>;
		errorCode: string;
		onInteractive: (data: T) => void;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	const client = requireClient(globalOpts);
	const data = await withSpinner(
		config.spinner,
		() => config.apiCall(client),
		config.errorCode,
		globalOpts,
	);
	if (!globalOpts.json && isInteractive()) {
		config.onInteractive(data);
	} else {
		outputResult(data, { json: globalOpts.json });
	}
}

export async function runGet<T>(
	config: {
		spinner: SpinnerMessages;
		apiCall: ApiCall<T>;
		onInteractive: (data: T) => void;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	return runAction({ ...config, errorCode: 'fetch_error' }, globalOpts);
}

export type CsvConfig = {
	headers: string[];
	// biome-ignore lint/suspicious/noExplicitAny: erased generic for csv config portability
	toRow: (item: any) => string[];
	// biome-ignore lint/suspicious/noExplicitAny: erased generic for csv config portability
	getItems: (result: any) => unknown[];
};

export async function runList<T>(
	config: {
		spinner: SpinnerMessages;
		apiCall: ApiCall<T>;
		onInteractive: (result: T) => void;
		csv?: CsvConfig;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	const format = resolveOutputFormat(globalOpts);

	if (format === 'csv' && config.csv) {
		const client = requireClient(globalOpts);
		const data = await withSpinner(
			config.spinner,
			() => config.apiCall(client),
			'list_error',
			globalOpts,
		);
		const items = config.csv.getItems(data);
		console.log(toCsv(config.csv.headers, items.map(config.csv.toRow)));
		return;
	}

	return runAction({ ...config, errorCode: 'list_error' }, globalOpts);
}

export async function runCreate<T>(
	config: {
		spinner: SpinnerMessages;
		apiCall: ApiCall<T>;
		onInteractive: (data: T) => void;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	return runAction({ ...config, errorCode: 'create_error' }, globalOpts);
}

export async function runDelete(
	id: string,
	skipConfirm: boolean,
	config: {
		confirmMessage: string;
		spinner: SpinnerMessages;
		object: string;
		successMsg: string;
		apiCall: ApiCall<unknown>;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	if (globalOpts.dryRun) {
		const preview = { dry_run: true, action: 'delete', object: config.object, id };
		if (!globalOpts.json && isInteractive()) {
			process.stderr.write(`${pc.yellow('DRY RUN')} \u2014 would delete ${config.object} ${id}\n`);
		} else {
			outputResult(preview, { json: globalOpts.json });
		}
		return;
	}
	const client = requireClient(globalOpts);
	if (!skipConfirm) {
		await confirmDelete(config.confirmMessage, globalOpts);
	}
	await withSpinner(config.spinner, () => config.apiCall(client), 'delete_error', globalOpts);
	if (!globalOpts.json && isInteractive()) {
		process.stderr.write(`${config.successMsg}\n`);
	} else {
		outputResult({ object: config.object, id, deleted: true }, { json: globalOpts.json });
	}
}

export async function runWrite<T>(
	config: {
		spinner: SpinnerMessages;
		apiCall: ApiCall<T>;
		errorCode: string;
		successMsg: string;
		dryRunAction?: string;
		/** For diff preview: fetches current state and returns {current, changes} */
		dryRunDiff?: (client: CyncoClient) => Promise<{
			current: Record<string, unknown>;
			changes: Record<string, unknown>;
		}>;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	if (globalOpts.dryRun) {
		// If diff preview is available, show before/after comparison
		if (config.dryRunDiff) {
			const client = requireClient(globalOpts);
			try {
				const { current, changes } = await config.dryRunDiff(client);
				const diffLines = computeDiff(current, changes);
				if (!globalOpts.json && isInteractive()) {
					process.stderr.write(
						`${pc.yellow('DRY RUN')} \u2014 would ${config.dryRunAction ?? config.errorCode}:\n`,
					);
					process.stderr.write(renderDiff(diffLines));
				} else {
					outputResult(
						{
							dry_run: true,
							action: config.dryRunAction ?? config.errorCode,
							diff: diffToJson(diffLines),
						},
						{ json: globalOpts.json },
					);
				}
			} catch {
				// Fallback to simple dry-run if fetch fails
				const preview = { dry_run: true, action: config.dryRunAction ?? config.errorCode };
				outputResult(preview, { json: globalOpts.json });
			}
			return;
		}
		const preview = { dry_run: true, action: config.dryRunAction ?? config.errorCode };
		if (!globalOpts.json && isInteractive()) {
			process.stderr.write(
				`${pc.yellow('DRY RUN')} \u2014 would ${config.dryRunAction ?? config.errorCode}\n`,
			);
		} else {
			outputResult(preview, { json: globalOpts.json });
		}
		return;
	}
	const client = requireClient(globalOpts);
	const data = await withSpinner(
		config.spinner,
		() => config.apiCall(client),
		config.errorCode,
		globalOpts,
	);
	if (!globalOpts.json && isInteractive()) {
		process.stderr.write(`${config.successMsg}\n`);
	} else {
		outputResult(data, { json: globalOpts.json });
	}
}
