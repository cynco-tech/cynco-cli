import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { readJsonOrFile } from '../../lib/files';
import { formatMoney, statusIndicator } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import { validateLineItems } from '../../lib/line-items';
import { outputError } from '../../lib/output';
import { promptForLineItems, requireText } from '../../lib/prompts';
import { mergeStdinWithFlags, readStdinJson } from '../../lib/stdin';
import type { Bill } from './utils';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createBillCmd = new Command('create')
	.description('Create a new bill')
	.option('--vendor-id <id>', 'Vendor ID')
	.option('--currency <code>', 'Currency code', 'MYR')
	.option('--due-date <date>', 'Due date (YYYY-MM-DD)')
	.option(
		'--items <json>',
		'Line items as JSON array or @file.json (e.g. \'[{"description":"Parts","quantity":5,"unitPrice":100}]\')',
	)
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bills create',
				'cynco bills create --vendor-id vend_abc123',
				'cynco bills create --vendor-id vend_abc123 --currency USD --due-date 2026-04-01',
				'cynco bills create --vendor-id vend_abc123 --items \'[{"description":"Parts","quantity":5,"unitPrice":100}]\'',
				'cynco bills create --vendor-id vend_abc123 --items @items.json',
				'echo \'{"vendorId":"vend_abc123","currency":"MYR"}\' | cynco bills create --stdin',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let body: Record<string, unknown>;

		if (opts.stdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			body = mergeStdinWithFlags(stdinBody, {
				vendorId: opts.vendorId,
				currency: opts.currency,
				dueDate: opts.dueDate,
			});
		} else {
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

			body = {
				vendorId,
				currency: opts.currency,
			};

			if (opts.dueDate) {
				if (!DATE_REGEX.test(opts.dueDate) || Number.isNaN(Date.parse(opts.dueDate))) {
					outputError(
						{
							message: `Invalid --due-date format: "${opts.dueDate}". Expected YYYY-MM-DD (e.g. 2026-04-01).`,
							code: 'invalid_date',
						},
						{ json: globalOpts.json },
					);
				}
				body.dueDate = opts.dueDate;
			}

			// Line items: from --items flag or interactive prompt
			if (opts.items) {
				const parsed = readJsonOrFile<unknown>(opts.items, globalOpts);
				body.lineItems = validateLineItems(parsed, globalOpts);
			} else {
				const interactiveItems = await promptForLineItems(globalOpts);
				if (interactiveItems.length > 0) {
					body.lineItems = interactiveItems;
				}
			}
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
					console.log(`  Total:      ${formatMoney(bill.total, bill.currency)}`);
					console.log(`  Currency:   ${bill.currency ?? '-'}`);
					console.log(`  Due Date:   ${bill.dueDate ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
