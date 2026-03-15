import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { requireText } from '../../lib/prompts';
import type { Bill } from './utils';
import { formatCurrency, statusIndicator } from './utils';

export const createBillCmd = new Command('create')
	.description('Create a new bill')
	.option('--vendor-id <id>', 'Vendor ID')
	.option('--currency <code>', 'Currency code', 'MYR')
	.option('--due-date <date>', 'Due date (YYYY-MM-DD)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bills create',
				'cynco bills create --vendor-id vend_abc123',
				'cynco bills create --vendor-id vend_abc123 --currency USD --due-date 2026-04-01',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const vendorId = await requireText(
			opts.vendorId,
			{
				message: 'Vendor ID',
				placeholder: 'vend_...',
			},
			{
				message: 'Vendor ID is required. Use --vendor-id <id>',
				code: 'missing_vendor_id',
			},
			globalOpts,
		);

		const body: Record<string, unknown> = {
			vendorId,
			currency: opts.currency,
		};

		if (opts.dueDate) {
			body.dueDate = opts.dueDate;
		}

		await runCreate<Bill>(
			{
				spinner: {
					loading: 'Creating bill...',
					success: 'Bill created',
					fail: 'Failed to create bill',
				},
				apiCall: (client) => client.post('/bills', body),
				onInteractive: (bill) => {
					console.log();
					console.log(`  Bill:       ${bill.billNumber ?? bill.id}`);
					console.log(`  ID:         ${bill.id}`);
					console.log(`  Vendor:     ${bill.vendorName ?? '-'}`);
					console.log(`  Status:     ${statusIndicator(bill.status)}`);
					console.log(`  Total:      ${formatCurrency(bill.total, bill.currency)}`);
					console.log(`  Currency:   ${bill.currency ?? '-'}`);
					console.log(`  Due Date:   ${bill.dueDate ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
