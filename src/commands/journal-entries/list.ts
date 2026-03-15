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
import type { JournalEntry } from './utils';
import { renderJournalEntriesTable } from './utils';

interface JournalEntryListResponse {
	journalEntries: JournalEntry[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

export const listCmd = new Command('list')
	.alias('ls')
	.description('List journal entries')
	.option('-l, --limit <n>', 'Results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option(
		'--status <status>',
		'Filter by status (draft, pending_approval, approved, posted, reversed, cancelled)',
	)
	.option('--period <period>', 'Filter by period (YYYY-MM)')
	.option('--sort <field>', 'Sort field (e.g. createdAt, date, entryNumber)')
	.option('--order <dir>', 'Sort order (asc, desc)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco journal-entries list',
				'cynco je ls --status posted',
				'cynco journal-entries list --period 2026-03',
				'cynco je list --sort date --order desc --limit 50',
				'cynco journal-entries list --json',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params: Record<string, string> = {
			...buildPaginationParams(page, limit, opts.sort, opts.order),
		};
		if (opts.status) {
			params.status = opts.status;
		}
		if (opts.period) {
			params.period = opts.period;
		}

		await runList<JournalEntryListResponse>(
			{
				spinner: {
					loading: 'Fetching journal entries...',
					success: 'Journal entries loaded',
					fail: 'Failed to fetch journal entries',
				},
				apiCall: (client) => client.get('/journal-entries', params),
				onInteractive: (result) => {
					console.log(renderJournalEntriesTable(result.journalEntries));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
			},
			globalOpts,
		);
	});
