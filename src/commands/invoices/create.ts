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
import type { Invoice } from './utils';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createInvoiceCmd = new Command('create')
	.description('Create a new invoice')
	.option('--customer-id <id>', 'Customer ID')
	.option('--currency <code>', 'Currency code', 'MYR')
	.option('--due-date <date>', 'Due date (YYYY-MM-DD)')
	.option('--memo <text>', 'Invoice memo or notes')
	.option(
		'--items <json>',
		'Line items as JSON array or @file.json (e.g. \'[{"description":"Widget","quantity":10,"unitPrice":50}]\')',
	)
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices create',
				'cynco invoices create --customer-id cust_abc123',
				'cynco invoices create --customer-id cust_abc123 --currency USD --due-date 2026-04-01',
				'cynco invoices create --customer-id cust_abc123 --memo "March services"',
				'cynco invoices create --customer-id cust_abc123 --items \'[{"description":"Consulting","quantity":10,"unitPrice":150}]\'',
				'cynco invoices create --customer-id cust_abc123 --items @items.json',
				'echo \'{"customerId":"cust_abc123","currency":"MYR"}\' | cynco invoices create --stdin',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let body: Record<string, unknown>;

		if (opts.stdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			body = mergeStdinWithFlags(stdinBody, {
				customerId: opts.customerId,
				currency: opts.currency,
				dueDate: opts.dueDate,
				memo: opts.memo,
			});
		} else {
			const customerId = await requireText(
				opts.customerId,
				{
					message: 'Customer ID',
					placeholder: 'cust_...',
				},
				{
					message: 'Customer ID is required. Use --customer-id <id>',
					code: 'missing_customer_id',
				},
				globalOpts,
			);

			body = {
				customerId,
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

			if (opts.memo) {
				body.memo = opts.memo;
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

		await runCreate<Invoice>(
			{
				spinner: {
					loading: 'Creating invoice...',
					success: 'Invoice created',
					fail: 'Failed to create invoice',
				},
				apiCall: (client) => client.post('/invoices', body),
				onInteractive: (invoice) => {
					console.log();
					console.log(`  Invoice:    ${invoice.invoiceNumber ?? invoice.id}`);
					console.log(`  ID:         ${invoice.id}`);
					console.log(`  Customer:   ${invoice.customerName ?? '-'}`);
					console.log(`  Status:     ${statusIndicator(invoice.status)}`);
					console.log(`  Total:      ${formatMoney(invoice.total, invoice.currency)}`);
					console.log(`  Currency:   ${invoice.currency ?? '-'}`);
					console.log(`  Due Date:   ${invoice.dueDate ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
