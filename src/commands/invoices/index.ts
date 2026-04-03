import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { batchFinalizeCmd } from './batch-finalize';
import { batchSendCmd } from './batch-send';
import { batchVoidCmd } from './batch-void';
import { createInvoiceCmd } from './create';
import { finalizeCmd } from './finalize';
import { getInvoiceCmd } from './get';
import { listInvoicesCmd } from './list';
import { overdueCmd } from './overdue';
import { recordPaymentCmd } from './record-payment';
import { sendInvoiceCmd } from './send-invoice';
import { voidCmd } from './void';

export const invoicesCmd = new Command('invoices')
	.description('Manage invoices')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices list',
				'cynco invoices get inv_abc123',
				'cynco invoices create --customer-id cust_abc123',
				'cynco invoices overdue',
				'cynco invoices finalize inv_abc123',
				'cynco invoices send inv_abc123',
				'cynco invoices record-payment inv_abc123 --amount 1500',
				'cynco invoices batch-send inv_001 inv_002',
				'cynco invoices batch-finalize --file ids.txt',
			],
		}),
	)
	.addCommand(listInvoicesCmd, { isDefault: true })
	.addCommand(getInvoiceCmd)
	.addCommand(createInvoiceCmd)
	.addCommand(overdueCmd)
	.addCommand(finalizeCmd)
	.addCommand(sendInvoiceCmd)
	.addCommand(voidCmd)
	.addCommand(recordPaymentCmd)
	.addCommand(batchSendCmd)
	.addCommand(batchFinalizeCmd)
	.addCommand(batchVoidCmd);
