import { Command } from '@commander-js/extra-typings';
import { resolveIds, runBatch } from '../../lib/batch';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const batchSendCmd = new Command('batch-send')
	.description('Send multiple invoices in bulk')
	.argument('[ids...]', 'Invoice IDs')
	.option('--file <path>', 'Read IDs from file (one per line)')
	.option('--stdin', 'Read IDs from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices batch-send inv_001 inv_002 inv_003',
				'cynco invoices batch-send --file ids.txt',
				'cynco invoices list --status finalized -o csv | tail -n +2 | cut -d, -f7 | cynco invoices batch-send --stdin',
			],
		}),
	)
	.action(async (args, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const ids = resolveIds(args, opts, globalOpts);

		await runBatch(
			ids,
			(client, id) => client.post(`/invoices/${id}/send`, {}),
			{ actionLabel: 'Sending', itemLabel: 'invoices' },
			globalOpts,
		);
	});
