import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { confirmDelete } from '../../lib/prompts';
import type { Invoice } from './utils';

export const voidCmd = new Command('void')
	.description('Void an invoice (irreversible)')
	.argument('<id>', 'Invoice ID')
	.option('--reason <text>', 'Reason for voiding')
	.option('-y, --yes', 'Skip confirmation')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices void inv_abc123',
				'cynco invoices void inv_abc123 --reason "Duplicate invoice" -y',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		if (!opts.yes) {
			await confirmDelete(
				`Are you sure you want to void invoice ${id}? This cannot be undone.`,
				globalOpts,
			);
		}

		const body: Record<string, unknown> = {};
		if (opts.reason) body.reason = opts.reason;

		await runWrite<Invoice>(
			{
				spinner: {
					loading: 'Voiding invoice...',
					success: 'Invoice voided',
					fail: 'Failed to void invoice',
				},
				apiCall: (client) => client.post(`/invoices/${id}/void`, body),
				errorCode: 'void_error',
				successMsg: `Invoice ${id} voided.`,
				dryRunAction: `void invoice ${id}`,
			},
			globalOpts,
		);
	});
