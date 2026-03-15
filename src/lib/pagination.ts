import type { GlobalOpts } from './client';
import { outputError } from './output';

export type PaginationInfo = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
};

export type ListResponse<K extends string, T> = {
	[key in K]: T[];
} & { pagination?: PaginationInfo };

export function parseLimitOpt(raw: string, globalOpts: GlobalOpts): number {
	const limit = parseInt(raw, 10);
	if (Number.isNaN(limit) || limit < 1 || limit > 100) {
		outputError(
			{
				message: '--limit must be an integer between 1 and 100',
				code: 'invalid_limit',
			},
			{ json: globalOpts.json },
		);
	}
	return limit;
}

export function parsePageOpt(raw: string, globalOpts: GlobalOpts): number {
	const page = parseInt(raw, 10);
	if (Number.isNaN(page) || page < 1) {
		outputError(
			{
				message: '--page must be a positive integer',
				code: 'invalid_page',
			},
			{ json: globalOpts.json },
		);
	}
	return page;
}

export function buildPaginationParams(
	page: number,
	limit: number,
	sort?: string,
	order?: string,
): Record<string, string> {
	const params: Record<string, string> = {
		page: String(page),
		limit: String(limit),
	};
	if (sort) {
		params.sort = sort;
	}
	if (order) {
		params.order = order;
	}
	return params;
}

export function printPaginationHint(pagination: {
	hasMore: boolean;
	page: number;
	totalPages: number;
}): void {
	if (pagination.hasMore) {
		console.log(
			`\nPage ${pagination.page} of ${pagination.totalPages}. Use --page ${pagination.page + 1} for next page.`,
		);
	}
}
