import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import {
	buildFilterParams,
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { JournalEntry, JournalEntryListResponse } from '../../types/journal-entry';
import { renderJournalEntriesTable } from './utils';

export const listCmd = new Command('list')
	.alias('ls')
	.description('List journal entries')
	.option('-l, --limit <n>', 'Results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option(
		'--status <status>',
		'Filter by status (draft, pending_approval, approved, posted, reversed, cancelled)',
	)
	.option('-s, --search <query>', 'Search by description or entry number')
	.option('--period <period>', 'Filter by period (YYYY-MM)')
	.option('--from <date>', 'Filter from date (YYYY-MM-DD)')
	.option('--to <date>', 'Filter to date (YYYY-MM-DD)')
	.option('--sort <field>', 'Sort field (e.g. createdAt, date, entryNumber)')
	.option('--order <dir>', 'Sort order (asc, desc)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco journal-entries list',
				'cynco je ls --status posted',
				'cynco journal-entries list --search "supplies"',
				'cynco journal-entries list --from 2026-01-01 --to 2026-03-31',
				'cynco je list --sort date --order desc --limit 50',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params = buildFilterParams(buildPaginationParams(page, limit, opts.sort, opts.order), {
			status: opts.status,
			search: opts.search,
			period: opts.period,
			from: opts.from,
			to: opts.to,
		});

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
				csv: {
					headers: ['Entry #', 'Date', 'Status', 'Description', 'Debit', 'Credit', 'ID'],
					toRow: (e: JournalEntry) => [
						e.entryNumber ?? '',
						e.date ?? '',
						e.status ?? '',
						e.description ?? '',
						formatMoney(e.totalDebit),
						formatMoney(e.totalCredit),
						e.id,
					],
					getItems: (r) => (r as JournalEntryListResponse).journalEntries ?? [],
				},
			},
			globalOpts,
		);
	});
