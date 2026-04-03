import { Command } from '@commander-js/extra-typings';
import { resolveIds, runBatch } from '../../lib/batch';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { confirmDelete } from '../../lib/prompts';

export const batchVoidCmd = new Command('batch-void')
	.description('Void multiple invoices in bulk (irreversible)')
	.argument('[ids...]', 'Invoice IDs')
	.option('--file <path>', 'Read IDs from file (one per line)')
	.option('--stdin', 'Read IDs from stdin')
	.option('--reason <text>', 'Reason for voiding')
	.option('-y, --yes', 'Skip confirmation')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices batch-void inv_001 inv_002 --yes',
				'cynco invoices batch-void --file ids.txt --reason "Duplicate" --yes',
			],
		}),
	)
	.action(async (args, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const ids = resolveIds(args, opts, globalOpts);

		if (!opts.yes) {
			await confirmDelete(
				`Are you sure you want to void ${ids.length} invoice(s)? This cannot be undone.`,
				globalOpts,
			);
		}

		const body: Record<string, unknown> = {};
		if (opts.reason) body.reason = opts.reason;

		await runBatch(
			ids,
			(client, id) => client.post(`/invoices/${id}/void`, body),
			{ actionLabel: 'Voiding', itemLabel: 'invoices' },
			globalOpts,
		);
	});
