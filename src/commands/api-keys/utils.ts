import pc from 'picocolors';
import { renderTable } from '../../lib/table';
import type { ApiKey } from '../../types/api-key';

export type { ApiKey } from '../../types/api-key';

export const VALID_SCOPES = [
	'invoices:read',
	'invoices:write',
	'customers:read',
	'customers:write',
	'vendors:read',
	'vendors:write',
	'bills:read',
	'bills:write',
	'accounts:read',
	'accounts:write',
	'journal_entries:read',
	'journal_entries:write',
	'banking:read',
	'banking:write',
	'reports:read',
	'items:read',
	'items:write',
	'webhooks:read',
	'webhooks:write',
	'*',
] as const;

export type Scope = (typeof VALID_SCOPES)[number];

export function validateScopes(raw: string): string[] {
	const scopes = raw.split(',').map((s) => s.trim());
	const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s as Scope));
	if (invalid.length > 0) {
		throw new Error(`Invalid scopes: ${invalid.join(', ')}`);
	}
	return scopes;
}

export function renderApiKeysTable(keys: ApiKey[]): string {
	const headers = ['Name', 'Key Prefix', 'Scopes', 'Last Used', 'ID'];
	const rows = keys.map((k) => [
		k.name ?? '-',
		k.keyPrefix ? `${k.keyPrefix}...` : pc.dim('(masked)'),
		k.scopes?.join(', ') ?? '-',
		k.lastUsedAt ?? pc.dim('never'),
		k.id,
	]);
	return renderTable(headers, rows, {
		message: 'No API keys found.',
		suggestion: 'Create one with: cynco api-keys create --name "My Key"',
	});
}
