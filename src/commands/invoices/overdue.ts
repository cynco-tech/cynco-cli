import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import { renderTable } from '../../lib/table';

interface OverdueInvoice {
	id: string;
	invoiceNumber?: string;
	customerName?: string;
	total?: number;
	currency?: string;
	dueDate?: string;
	status?: string;
}

interface OverdueResponse {
	invoices: OverdueInvoice[];
	pagination?: { total: number; hasMore: boolean; page: number; totalPages: number };
}

const MS_PER_DAY = 86_400_000;

function daysOverdue(dueDate?: string): number {
	if (!dueDate) return 0;
	const due = Date.parse(dueDate);
	if (Number.isNaN(due)) return 0;
	return Math.max(0, Math.floor((Date.now() - due) / MS_PER_DAY));
}

function agingBucket(days: number): string {
	if (days <= 30) return pc.yellow('1-30');
	if (days <= 60) return pc.red('31-60');
	if (days <= 90) return pc.red('61-90');
	return pc.bgRed(pc.white(' 90+ '));
}

export const overdueCmd = new Command('overdue')
	.description('List overdue invoices with aging')
	.option('-l, --limit <n>', 'Results per page', '20')
	.option('--page <n>', 'Page number', '1')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices overdue',
				'cynco invoices overdue --limit 50',
				'cynco invoices overdue --json',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runList<OverdueResponse>(
			{
				spinner: {
					loading: 'Fetching overdue invoices...',
					success: 'Overdue invoices loaded',
					fail: 'Failed to fetch invoices',
				},
				apiCall: (client) =>
					client.get('/invoices', {
						status: 'overdue',
						limit: opts.limit,
						page: opts.page,
					}),
				onInteractive: (result) => {
					const invoices = result.invoices ?? [];
					if (invoices.length === 0) {
						console.log(`\n  ${pc.green('No overdue invoices.')} \n`);
						return;
					}

					const headers = [
						'Invoice #',
						'Customer',
						'Amount',
						'Due Date',
						'Days Overdue',
						'Aging',
						'ID',
					];
					const rows = invoices.map((inv) => {
						const days = daysOverdue(inv.dueDate);
						return [
							inv.invoiceNumber ?? '-',
							inv.customerName ?? '-',
							formatMoney(inv.total, inv.currency),
							inv.dueDate ?? '-',
							String(days),
							agingBucket(days),
							inv.id,
						];
					});

					console.log(`\n  ${pc.bold(pc.red(`Overdue Invoices (${invoices.length})`))} \n`);
					console.log(renderTable(headers, rows));

					// Total overdue amount by currency
					const totals = new Map<string, number>();
					for (const inv of invoices) {
						const cur = inv.currency ?? 'Unknown';
						totals.set(cur, (totals.get(cur) ?? 0) + (inv.total ?? 0));
					}
					for (const [currency, total] of totals) {
						console.log(
							`  ${pc.bold('Total overdue')} (${currency}): ${pc.red(formatMoney(total, currency))}`,
						);
					}
					console.log('');
				},
			},
			globalOpts,
		);
	});
