import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { mergeStdinWithFlags, readStdinJson } from '../../lib/stdin';
import type { Item } from './utils';

export const updateItemCmd = new Command('update')
	.description('Update an item')
	.argument('<id>', 'Item ID')
	.option('--name <name>', 'Item name')
	.option('--description <desc>', 'Item description')
	.option('--unit-price <price>', 'Unit price')
	.option('--tax-rate <rate>', 'Tax rate (percentage)')
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco items update itm_abc123 --name "Updated Name"',
				'cynco items update itm_abc123 --unit-price 200.00 --tax-rate 8',
				'echo \'{"name":"Updated","unitPrice":200}\' | cynco items update itm_abc123 --stdin',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let body: Record<string, unknown>;

		if (opts.stdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			body = mergeStdinWithFlags(stdinBody, {
				name: opts.name,
				description: opts.description,
				unitPrice: opts.unitPrice,
				taxRate: opts.taxRate,
			});
			body.id = id;
		} else {
			body = { id };
			if (opts.name) body.name = opts.name;
			if (opts.description) body.description = opts.description;
			if (opts.unitPrice) {
				const unitPrice = parseFloat(opts.unitPrice);
				if (Number.isNaN(unitPrice) || unitPrice < 0) {
					outputError(
						{
							message: `Invalid unit price "${opts.unitPrice}". Must be a non-negative number.`,
							code: 'invalid_unit_price',
						},
						{ json: globalOpts.json },
					);
				}
				body.unitPrice = unitPrice;
			}
			if (opts.taxRate) {
				const taxRate = parseFloat(opts.taxRate);
				if (Number.isNaN(taxRate) || taxRate < 0) {
					outputError(
						{
							message: `Invalid tax rate "${opts.taxRate}". Must be a non-negative number.`,
							code: 'invalid_tax_rate',
						},
						{ json: globalOpts.json },
					);
				}
				body.taxRate = taxRate;
			}
		}

		await runWrite<Item>(
			{
				spinner: {
					loading: 'Updating item...',
					success: 'Item updated',
					fail: 'Failed to update item',
				},
				apiCall: (client) => client.patch('/items', body),
				errorCode: 'update_error',
				successMsg: `Item ${id} updated.`,
				dryRunAction: `update item ${id}`,
				dryRunDiff: async (client) => {
					const result = await client.get<Item>(`/items/${id}`);
					const current = (result.data ?? {}) as Record<string, unknown>;
					const { id: _id, ...changes } = body;
					return { current, changes };
				},
			},
			globalOpts,
		);
	});
