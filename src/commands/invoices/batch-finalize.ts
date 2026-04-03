import { Command } from '@commander-js/extra-typings';
import { resolveIds, runBatch } from '../../lib/batch';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const batchFinalizeCmd = new Command('batch-finalize')
	.description('Finalize multiple draft invoices in bulk')
	.argument('[ids...]', 'Invoice IDs')
	.option('--file <path>', 'Read IDs from file (one per line)')
	.option('--stdin', 'Read IDs from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices batch-finalize inv_001 inv_002',
				'cynco invoices batch-finalize --file ids.txt',
			],
		}),
	)
	.action(async (args, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const ids = resolveIds(args, opts, globalOpts);

		await runBatch(
			ids,
			(client, id) => client.post(`/invoices/${id}/finalize`, {}),
			{ actionLabel: 'Finalizing', itemLabel: 'invoices' },
			globalOpts,
		);
	});
