import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { promptForMissing } from '../../lib/prompts';
import { mergeStdinWithFlags, readStdinJson } from '../../lib/stdin';
import type { Item } from './utils';
import { renderItemsTable } from './utils';

export const createItemCmd = new Command('create')
	.description('Create a new item')
	.option('--name <name>', 'Item name')
	.option('--description <desc>', 'Item description')
	.option('--unit-price <price>', 'Unit price')
	.option('--tax-rate <rate>', 'Tax rate (percentage)')
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco items create --name "Consulting" --unit-price 150.00',
				'cynco items create --name "Widget" --unit-price 9.99 --tax-rate 6',
				'cynco items create',
				'echo \'{"name":"Widget","unitPrice":9.99}\' | cynco items create --stdin',
			],
		}),
	)
	.action(async (opts, cmd) => {
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
		} else {
			const filled = await promptForMissing(
				{ name: opts.name, 'unit-price': opts.unitPrice },
				[
					{ flag: 'name', message: 'Item name', required: true },
					{ flag: 'unit-price', message: 'Unit price', placeholder: '0.00', required: true },
				],
				globalOpts,
			);

			const unitPrice = parseFloat(filled['unit-price']);
			if (Number.isNaN(unitPrice) || unitPrice < 0) {
				outputError(
					{
						message: `Invalid unit price "${filled['unit-price']}". Must be a non-negative number.`,
						code: 'invalid_unit_price',
					},
					{ json: globalOpts.json },
				);
			}

			body = {
				name: filled.name,
				unitPrice,
			};
			if (opts.description) {
				body.description = opts.description;
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

		await runCreate<Item>(
			{
				spinner: {
					loading: 'Creating item...',
					success: 'Item created',
					fail: 'Failed to create item',
				},
				apiCall: (client) => client.post('/items', body),
				onInteractive: (item) => {
					console.log(renderItemsTable([item]));
				},
			},
			globalOpts,
		);
	});
