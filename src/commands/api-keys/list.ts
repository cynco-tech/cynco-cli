import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import {
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { ApiKey, ApiKeyListResponse } from '../../types/api-key';
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

		await runList<ApiKeyListResponse>(
			{
				spinner: {
					loading: 'Fetching API keys...',
					success: 'API keys loaded',
					fail: 'Failed to fetch API keys',
				},
				apiCall: (client) => client.get('/api-keys', params),
				onInteractive: (result) => {
					console.log(renderApiKeysTable(result.apiKeys ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
				csv: {
					headers: ['Name', 'Key Prefix', 'Scopes', 'Last Used', 'ID'],
					toRow: (k: ApiKey) => [
						k.name ?? '',
						k.keyPrefix ?? '',
						k.scopes?.join(', ') ?? '',
						k.lastUsedAt ?? '',
						k.id,
					],
					getItems: (r) => (r as ApiKeyListResponse).apiKeys ?? [],
				},
			},
			globalOpts,
		);
	});
