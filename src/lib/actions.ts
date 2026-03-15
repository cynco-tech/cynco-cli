import type { CyncoClient, GlobalOpts } from './client';
import { requireClient } from './client';
import { outputResult } from './output';
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

export async function runList<T>(
	config: {
		spinner: SpinnerMessages;
		apiCall: ApiCall<T>;
		onInteractive: (result: T) => void;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
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
	const client = requireClient(globalOpts);
	if (!skipConfirm) {
		await confirmDelete(config.confirmMessage, globalOpts);
	}
	await withSpinner(config.spinner, () => config.apiCall(client), 'delete_error', globalOpts);
	if (!globalOpts.json && isInteractive()) {
		console.log(config.successMsg);
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
		console.log(config.successMsg);
	} else {
		outputResult(data, { json: globalOpts.json });
	}
}
