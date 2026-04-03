import { Command } from '@commander-js/extra-typings';
import { runGet } from '../lib/actions';
import type { GlobalOpts } from '../lib/client';
import { formatMoney } from '../lib/format';
import { buildHelpText } from '../lib/help-text';
import { renderTable } from '../lib/table';
import type { ReportData } from '../types/report';

function titleCase(str: string): string {
	return str
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (s) => s.toUpperCase())
		.trim();
}

function renderReportResult(report: ReportData, label: string): void {
	const firstRow = report.rows?.[0];
	if (report.rows && report.rows.length > 0 && firstRow) {
		const keys = Object.keys(firstRow);
		const headers = keys.map(titleCase);
		const rows = report.rows.map((row) =>
			keys.map((k) => {
				const val = row[k];
				if (val == null) return '-';
				if (typeof val === 'number') return formatMoney(val);
				return String(val);
			}),
		);
		console.log(`\n  ${label}`);
		if (report.period) console.log(`  Period: ${report.period}`);
		if (report.startDate && report.endDate) {
			console.log(`  Range: ${report.startDate} to ${report.endDate}`);
		}
		console.log('');
		console.log(renderTable(headers, rows));
	}

	if (report.summary) {
		console.log('');
		for (const [key, val] of Object.entries(report.summary)) {
			const display = typeof val === 'number' ? formatMoney(val) : String(val ?? '-');
			console.log(`  ${titleCase(key)}: ${display}`);
		}
	}
}

interface ShortcutConfig {
	alias: string;
	reportType: string;
	label: string;
	description: string;
}

function createReportShortcut(config: ShortcutConfig): Command {
	return new Command(config.alias)
		.description(
			`${config.description} (shortcut for reports generate --type ${config.reportType})`,
		)
		.option('--period <period>', 'Report period (YYYY-MM)')
		.option('--start-date <date>', 'Start date (YYYY-MM-DD)')
		.option('--end-date <date>', 'End date (YYYY-MM-DD)')
		.addHelpText(
			'after',
			buildHelpText({
				examples: [
					`cynco ${config.alias}`,
					`cynco ${config.alias} --period 2026-03`,
					`cynco ${config.alias} --start-date 2026-01-01 --end-date 2026-03-31`,
				],
			}),
		)
		.action(async (opts, cmd) => {
			const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

			const params: Record<string, string> = {};
			if (opts.period) params.period = opts.period;
			if (opts.startDate) params.startDate = opts.startDate;
			if (opts.endDate) params.endDate = opts.endDate;

			await runGet<ReportData>(
				{
					spinner: {
						loading: `Generating ${config.label}...`,
						success: `${config.label} generated`,
						fail: `Failed to generate ${config.label}`,
					},
					apiCall: (client) => client.get(`/reports/${config.reportType}`, params),
					onInteractive: (report) => {
						renderReportResult(report, config.label);
					},
				},
				globalOpts,
			);
		});
}

export const tbCmd = createReportShortcut({
	alias: 'tb',
	reportType: 'trial_balance',
	label: 'Trial Balance',
	description: 'Generate Trial Balance',
});

export const bsCmd = createReportShortcut({
	alias: 'bs',
	reportType: 'balance_sheet',
	label: 'Balance Sheet',
	description: 'Generate Balance Sheet',
});

export const plCmd = createReportShortcut({
	alias: 'pl',
	reportType: 'income_statement',
	label: 'Profit & Loss',
	description: 'Generate Profit & Loss (Income Statement)',
});

export const arCmd = createReportShortcut({
	alias: 'ar',
	reportType: 'aged_receivables',
	label: 'Aged Receivables',
	description: 'Generate Aged Receivables report',
});

export const apCmd = createReportShortcut({
	alias: 'ap',
	reportType: 'aged_payables',
	label: 'Aged Payables',
	description: 'Generate Aged Payables report',
});
