import pc from 'picocolors';
import { renderTable } from '../../lib/table';

export interface Webhook {
	id: string;
	url?: string;
	events?: string[];
	active?: boolean;
	createdAt?: string;
}

export function renderWebhooksTable(webhooks: Webhook[]): string {
	const headers = ['URL', 'Events', 'Active', 'ID'];
	const rows = webhooks.map((wh) => [
		wh.url ?? '-',
		wh.events?.join(', ') ?? '-',
		wh.active == null ? '-' : wh.active ? pc.green('yes') : pc.dim('no'),
		wh.id,
	]);
	return renderTable(headers, rows, 'No webhooks found.');
}
