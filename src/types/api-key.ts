import type { PaginationInfo } from './common';

export interface ApiKey {
	id: string;
	name?: string;
	keyPrefix?: string;
	scopes?: string[];
	lastUsedAt?: string;
	createdAt?: string;
}

export interface ApiKeyListResponse {
	apiKeys: ApiKey[];
	pagination?: PaginationInfo;
}

export interface CreateApiKeyResponse {
	id: string;
	name: string;
	key: string;
	scopes: string[];
	createdAt: string;
}
