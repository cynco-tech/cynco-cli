import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import { requireClient } from '../lib/client';
import { readFileAsFormData } from '../lib/files';
import { formatMoney } from '../lib/format';
import { buildHelpText } from '../lib/help-text';
import { errorMessage, outputError, outputResult } from '../lib/output';
import { createSpinner } from '../lib/spinner';
import { renderTable } from '../lib/table';
import { isInteractive } from '../lib/tty';

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'];
const DOCUMENT_TYPES = [
	'auto',
	'invoice',
	'receipt',
	'bank_statement',
	'bill',
	'purchase_order',
] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

interface ExtractionResult {
	id: string;
	status: string;
	documentType?: string;
	fileName?: string;
	confidence?: number;
	data?: {
		vendorName?: string;
		customerName?: string;
		invoiceNumber?: string;
		date?: string;
		dueDate?: string;
		currency?: string;
		subtotal?: number;
		tax?: number;
		total?: number;
		lineItems?: Array<{
			description?: string;
			quantity?: number;
			unitPrice?: number;
			amount?: number;
		}>;
		[key: string]: unknown;
	};
}

function renderExtractionResult(result: ExtractionResult): void {
	const d = result.data;
	if (!d) {
		console.log(`\n  ${pc.yellow('No data extracted.')}\n`);
		return;
	}

	console.log('');
	console.log(`  ${pc.bold('Extraction Result')}`);
	if (result.documentType) console.log(`  ${pc.dim('Type:')}        ${result.documentType}`);
	if (result.confidence)
		console.log(`  ${pc.dim('Confidence:')}  ${Math.round(result.confidence * 100)}%`);
	console.log('');

	if (d.vendorName) console.log(`  ${pc.bold('Vendor:')}      ${d.vendorName}`);
	if (d.customerName) console.log(`  ${pc.bold('Customer:')}    ${d.customerName}`);
	if (d.invoiceNumber) console.log(`  ${pc.bold('Invoice #:')}   ${d.invoiceNumber}`);
	if (d.date) console.log(`  ${pc.bold('Date:')}        ${d.date}`);
	if (d.dueDate) console.log(`  ${pc.bold('Due Date:')}    ${d.dueDate}`);
	if (d.currency) console.log(`  ${pc.bold('Currency:')}    ${d.currency}`);

	if (d.lineItems && d.lineItems.length > 0) {
		console.log('');
		const headers = ['Description', 'Qty', 'Unit Price', 'Amount'];
		const rows = d.lineItems.map((li) => [
			li.description ?? '-',
			li.quantity != null ? String(li.quantity) : '-',
			formatMoney(li.unitPrice, d.currency),
			formatMoney(li.amount, d.currency),
		]);
		console.log(renderTable(headers, rows));
	}

	console.log('');
	if (d.subtotal != null)
		console.log(`  ${pc.dim('Subtotal:')}    ${formatMoney(d.subtotal, d.currency)}`);
	if (d.tax != null) console.log(`  ${pc.dim('Tax:')}         ${formatMoney(d.tax, d.currency)}`);
	if (d.total != null)
		console.log(`  ${pc.bold('Total:')}       ${pc.green(formatMoney(d.total, d.currency))}`);
	console.log('');
	console.log(`  ${pc.dim(`Extraction ID: ${result.id}`)}`);
	console.log('');
}

export const extractCmd = new Command('extract')
	.description('Extract data from a document using AI')
	.argument('<file>', 'Path to the document (PDF, PNG, JPG)')
	.option(
		'-t, --type <type>',
		'Document type: auto, invoice, receipt, bank_statement, bill, purchase_order',
		'auto',
	)
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco extract ./invoice.pdf',
				'cynco extract ./receipt.jpg --type receipt',
				'cynco extract ./statement.pdf --type bank_statement',
				'cynco extract ./bill.pdf --json',
			],
		}),
	)
	.action(async (filePath, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		if (!DOCUMENT_TYPES.includes(opts.type as DocumentType)) {
			outputError(
				{
					message: `Invalid document type "${opts.type}". Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
					code: 'invalid_type',
				},
				{ json: globalOpts.json },
			);
		}

		const { formData } = readFileAsFormData(filePath, SUPPORTED_EXTENSIONS, globalOpts);
		formData.set('documentType', opts.type);

		const client = requireClient(globalOpts);
		const spinner = createSpinner('Uploading and extracting...', globalOpts.quiet);

		try {
			const result = await client.upload<ExtractionResult>('/extractions', formData);

			if (result.error) {
				spinner.fail('Extraction failed');
				outputError(
					{ message: result.error.message, code: 'extraction_error' },
					{ json: globalOpts.json },
				);
			}

			if (!result.data) {
				spinner.fail('Extraction failed');
				outputError(
					{ message: 'Empty response from extraction service', code: 'extraction_error' },
					{ json: globalOpts.json },
				);
			}

			spinner.stop('Extraction complete');

			if (!globalOpts.json && isInteractive()) {
				renderExtractionResult(result.data);
			} else {
				outputResult(result.data, { json: globalOpts.json });
			}
		} catch (err) {
			spinner.fail('Extraction failed');
			outputError(
				{ message: errorMessage(err, 'Unknown error'), code: 'extraction_error' },
				{ json: globalOpts.json },
			);
		}
	});
