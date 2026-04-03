import pc from 'picocolors';
import { renderTable } from '../../lib/table';
import type { Webhook } from '../../types/webhook';

export type { Webhook } from '../../types/webhook';

export function renderWebhooksTable(webhooks: Webhook[]): string {
	const headers = ['URL', 'Events', 'Active', 'ID'];
	const rows = webhooks.map((wh) => [
		wh.url ?? '-',
		wh.events?.join(', ') ?? '-',
		wh.active == null ? '-' : wh.active ? pc.green('yes') : pc.dim('no'),
		wh.id,
	]);
	return renderTable(headers, rows, {
		message: 'No webhooks found.',
		suggestion: 'Create one with: cynco webhooks create --url https://example.com/hook',
	});
}
