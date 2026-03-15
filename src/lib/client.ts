import { listProfiles, resolveApiKey } from './config';
import { errorMessage, outputError } from './output';
import { VERSION } from './version';

export type GlobalOpts = {
	apiKey?: string;
	json?: boolean;
	quiet?: boolean;
	profile?: string;
};

export const DEFAULT_BASE_URL = 'https://app.cynco.io';

type ApiSuccessResponse<T> = {
	success: true;
	data: T;
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
	meta?: {
		requestId: string;
		apiVersion: string;
		timestamp: string;
	};
};

type ApiErrorResponse = {
	success: false;
	error: {
		code: string;
		message: string;
		details?: Array<{ field: string; message: string }>;
	};
	meta?: {
		requestId: string;
		apiVersion: string;
		timestamp: string;
	};
};

type ApiRawResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiResult<T> = {
	data: T | null;
	error: { message: string; code?: string } | null;
	headers?: Record<string, string> | null;
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	} | null;
};

export class CyncoClient {
	private apiKey: string;
	private baseUrl: string;

	constructor(apiKey: string, baseUrl?: string) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl || process.env.CYNCO_API_URL || DEFAULT_BASE_URL;
	}

	private authHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			'User-Agent': `cynco-cli/${VERSION}`,
		};
	}

	private buildUrl(path: string, params?: Record<string, string>): URL {
		const url = new URL(`/api/v1${path}`, this.baseUrl);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== '') {
					url.searchParams.set(key, value);
				}
			}
		}
		return url;
	}

	private async parseResponse<T>(res: Response): Promise<ApiResult<T>> {
		const retryAfter = res.headers.get('retry-after');
		const responseHeaders: Record<string, string> | null = retryAfter
			? { 'retry-after': retryAfter }
			: null;

		const json = (await res.json()) as ApiRawResponse<T>;

		if (!json.success) {
			const errResponse = json as ApiErrorResponse;
			return {
				data: null,
				error: { message: errResponse.error.message, code: errResponse.error.code },
				headers: responseHeaders,
			};
		}

		const successResponse = json as ApiSuccessResponse<T>;
		return {
			data: successResponse.data,
			error: null,
			headers: responseHeaders,
			pagination: successResponse.pagination ?? null,
		};
	}

	async request<T>(
		method: string,
		path: string,
		body?: Record<string, unknown>,
		params?: Record<string, string>,
	): Promise<ApiResult<T>> {
		const url = this.buildUrl(path, params);
		const headers = this.authHeaders();
		if (body) {
			headers['Content-Type'] = 'application/json';
		}

		const res = await fetch(url.toString(), {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(30000),
		});

		return this.parseResponse<T>(res);
	}

	// Convenience methods
	async get<T>(path: string, params?: Record<string, string>): Promise<ApiResult<T>> {
		return this.request<T>('GET', path, undefined, params);
	}

	async post<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
		return this.request<T>('POST', path, body);
	}

	async patch<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
		return this.request<T>('PATCH', path, body);
	}

	async delete<T>(path: string): Promise<ApiResult<T>> {
		return this.request<T>('DELETE', path);
	}

	async upload<T>(path: string, formData: FormData): Promise<ApiResult<T>> {
		const url = this.buildUrl(path);

		const res = await fetch(url.toString(), {
			method: 'POST',
			headers: this.authHeaders(),
			body: formData,
			signal: AbortSignal.timeout(120000),
		});

		return this.parseResponse<T>(res);
	}
}

export function createClient(flagValue?: string, profileName?: string): CyncoClient {
	const resolved = resolveApiKey(flagValue, profileName);
	if (!resolved) {
		if (profileName) {
			const profiles = listProfiles();
			const exists = profiles.some((p) => p.name === profileName);
			if (!exists) {
				throw new Error(
					`Profile "${profileName}" not found. Available profiles: ${profiles.map((p) => p.name).join(', ') || '(none)'}`,
				);
			}
		}
		throw new Error('No API key found. Set CYNCO_API_KEY, use --api-key, or run: cynco login');
	}
	return new CyncoClient(resolved.key);
}

export function requireClient(opts: GlobalOpts): CyncoClient {
	try {
		return createClient(opts.apiKey, opts.profile);
	} catch (err) {
		outputError(
			{
				message: errorMessage(err, 'Failed to create client'),
				code: 'auth_error',
			},
			{ json: opts.json },
		);
	}
}
