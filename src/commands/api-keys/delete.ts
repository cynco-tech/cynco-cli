import { Command } from '@commander-js/extra-typings';
import { runDelete } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const deleteApiKeyCmd = new Command('delete')
	.alias('rm')
	.description('Delete an API key')
	.argument('<id>', 'API key ID')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco api-keys delete api_abc123', 'cynco api-keys delete api_abc123 --yes'],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runDelete(
			id,
			!!opts.yes,
			{
				confirmMessage: `Delete API key ${id}? This will immediately revoke access.`,
				spinner: {
					loading: 'Deleting API key...',
					success: 'API key deleted',
					fail: 'Failed to delete API key',
				},
				object: 'api_key',
				successMsg: `API key ${id} deleted.`,
				apiCall: (client) => client.delete(`/api-keys/${id}`),
			},
			globalOpts,
		);
	});
