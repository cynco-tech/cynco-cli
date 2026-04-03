import type { PaginationInfo } from './common';

export interface Webhook {
	id: string;
	url?: string;
	events?: string[];
	active?: boolean;
	createdAt?: string;
}

export interface WebhookListResponse {
	webhooks: Webhook[];
	pagination?: PaginationInfo;
}
