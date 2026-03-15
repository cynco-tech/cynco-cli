import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Bill } from './utils';
import { formatCurrency, statusIndicator } from './utils';

export const getBillCmd = new Command('get')
	.description('Get a bill by ID')
	.argument('<id>', 'Bill ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco bills get bill_abc123', 'cynco bills get bill_abc123 --json'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runGet<Bill>(
			{
				spinner: {
					loading: 'Fetching bill...',
					success: 'Bill loaded',
					fail: 'Failed to fetch bill',
				},
				apiCall: (client) => client.get('/bills', { id }),
				onInteractive: (bill) => {
					console.log();
					console.log(`  Bill:       ${bill.billNumber ?? bill.id}`);
					console.log(`  ID:         ${bill.id}`);
					console.log(`  Vendor:     ${bill.vendorName ?? '-'}`);
					console.log(`  Status:     ${statusIndicator(bill.status)}`);
					console.log(`  Total:      ${formatCurrency(bill.total, bill.currency)}`);
					console.log(`  Currency:   ${bill.currency ?? '-'}`);
					console.log(`  Due Date:   ${bill.dueDate ?? '-'}`);
					console.log(`  Created:    ${bill.createdAt ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
