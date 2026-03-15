import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney, statusIndicator } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import type { Invoice } from './utils';

export const getInvoiceCmd = new Command('get')
	.description('Get an invoice by ID')
	.argument('<id>', 'Invoice ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco invoices get inv_abc123', 'cynco invoices get inv_abc123 --json'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runGet<Invoice>(
			{
				spinner: {
					loading: 'Fetching invoice...',
					success: 'Invoice loaded',
					fail: 'Failed to fetch invoice',
				},
				apiCall: (client) => client.get('/invoices', { id }),
				onInteractive: (invoice) => {
					console.log();
					console.log(`  Invoice:    ${invoice.invoiceNumber ?? invoice.id}`);
					console.log(`  ID:         ${invoice.id}`);
					console.log(`  Customer:   ${invoice.customerName ?? '-'}`);
					console.log(`  Status:     ${statusIndicator(invoice.status)}`);
					console.log(`  Total:      ${formatMoney(invoice.total, invoice.currency)}`);
					console.log(`  Currency:   ${invoice.currency ?? '-'}`);
					console.log(`  Due Date:   ${invoice.dueDate ?? '-'}`);
					console.log(`  Created:    ${invoice.createdAt ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
