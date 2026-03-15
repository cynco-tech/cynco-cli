import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { buildPaginationParams, parseLimitOpt, parsePageOpt } from '../../lib/pagination';
import type { ApiKey } from './utils';
import { renderApiKeysTable } from './utils';

export const listApiKeysCmd = new Command('list')
	.alias('ls')
	.description('List API keys')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco api-keys list', 'cynco api-keys ls', 'cynco api-keys list --limit 50'],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildPaginationParams(page, limit);

		await runList<ApiKey[]>(
			{
				spinner: {
					loading: 'Fetching API keys...',
					success: 'API keys loaded',
					fail: 'Failed to fetch API keys',
				},
				apiCall: (client) => client.get('/api-keys', params),
				onInteractive: (result) => {
					console.log(renderApiKeysTable(result ?? []));
				},
			},
			globalOpts,
		);
	});
