import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Invoice } from './utils';

export const finalizeCmd = new Command('finalize')
	.description('Finalize a draft invoice')
	.argument('<id>', 'Invoice ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco invoices finalize inv_abc123'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runWrite<Invoice>(
			{
				spinner: {
					loading: 'Finalizing invoice...',
					success: 'Invoice finalized',
					fail: 'Failed to finalize invoice',
				},
				apiCall: (client) => client.post(`/invoices/${id}/finalize`, {}),
				errorCode: 'finalize_error',
				successMsg: `Invoice ${id} finalized. Send it with: cynco invoices send ${id}`,
			},
			globalOpts,
		);
	});
