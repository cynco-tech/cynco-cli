import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError, outputResult } from '../../lib/output';
import { requireSelect } from '../../lib/prompts';
import { renderTable } from '../../lib/table';
import type { ReportData } from '../../types/report';

const REPORT_TYPES = [
	'trial_balance',
	'balance_sheet',
	'income_statement',
	'cash_flow',
	'general_ledger',
	'aged_receivables',
	'aged_payables',
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

function formatReportLabel(type: string): string {
	return type
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function renderReportTable(report: ReportData): void {
	const firstRow = report.rows?.[0];
	if (report.rows && report.rows.length > 0 && firstRow) {
		const keys = Object.keys(firstRow);
		const headers = keys.map((k) =>
			k
				.replace(/([A-Z])/g, ' $1')
				.replace(/^./, (s) => s.toUpperCase())
				.trim(),
		);
		const rows = report.rows.map((row) =>
			keys.map((k) => {
				const val = row[k];
				if (val == null) return '-';
				if (typeof val === 'number') {
					return val.toLocaleString('en-US', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					});
				}
				return String(val);
			}),
		);
		console.log(`\n  ${formatReportLabel(report.type)}`);
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
			const label = key
				.replace(/([A-Z])/g, ' $1')
				.replace(/^./, (s) => s.toUpperCase())
				.trim();
			const display =
				typeof val === 'number'
					? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
					: String(val ?? '-');
			console.log(`  ${label}: ${display}`);
		}
	}
}

export const generateReportCmd = new Command('generate')
	.description('Generate a financial report')
	.option(
		'-t, --type <type>',
		'Report type (trial_balance, balance_sheet, income_statement, cash_flow, general_ledger, aged_receivables, aged_payables)',
	)
	.option('--period <period>', 'Report period (YYYY-MM)')
	.option('--start-date <date>', 'Start date (YYYY-MM-DD)')
	.option('--end-date <date>', 'End date (YYYY-MM-DD)')
	.option('-f, --format <fmt>', 'Output format (json|csv)', 'json')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco reports generate --type trial_balance --period 2026-03',
				'cynco reports generate --type balance_sheet --start-date 2026-01-01 --end-date 2026-03-31',
				'cynco reports generate --type income_statement --period 2026-02 --format csv',
				'cynco reports generate --type aged_receivables',
				'cynco reports generate',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const VALID_FORMATS = ['json', 'csv'] as const;
		if (opts.format && !VALID_FORMATS.includes(opts.format as (typeof VALID_FORMATS)[number])) {
			outputError(
				{
					message: `Invalid format "${opts.format}". Must be one of: ${VALID_FORMATS.join(', ')}`,
					code: 'invalid_format',
				},
				{ json: globalOpts.json },
			);
		}

		if (opts.type && !REPORT_TYPES.includes(opts.type as ReportType)) {
			outputError(
				{
					message: `Invalid report type "${opts.type}". Must be one of: ${REPORT_TYPES.join(', ')}`,
					code: 'invalid_type',
				},
				{ json: globalOpts.json },
			);
		}

		const typeFlag =
			opts.type && REPORT_TYPES.includes(opts.type as ReportType)
				? (opts.type as ReportType)
				: undefined;
		const reportType = await requireSelect<ReportType>(
			typeFlag,
			{
				message: 'Select report type',
				options: REPORT_TYPES.map((t) => ({ value: t, label: formatReportLabel(t) })),
			},
			{ message: '--type is required', code: 'missing_type' },
			globalOpts,
		);

		const params: Record<string, string> = {};
		if (opts.period) params.period = opts.period;
		if (opts.startDate) params.startDate = opts.startDate;
		if (opts.endDate) params.endDate = opts.endDate;
		if (opts.format) params.format = opts.format;

		await runGet<ReportData>(
			{
				spinner: {
					loading: `Generating ${formatReportLabel(reportType)} report...`,
					success: 'Report generated',
					fail: 'Failed to generate report',
				},
				apiCall: (client) => client.get(`/reports/${reportType}`, params),
				onInteractive: (report) => {
					if (opts.format === 'csv') {
						outputResult(report, { json: false });
					} else {
						renderReportTable(report);
					}
				},
			},
			globalOpts,
		);
	});
