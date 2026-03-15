import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { createInvoiceCmd } from './create';
import { getInvoiceCmd } from './get';
import { listInvoicesCmd } from './list';

export const invoicesCmd = new Command('invoices')
	.description('Manage invoices')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices list',
				'cynco invoices get inv_abc123',
				'cynco invoices create --customer-id cust_abc123',
			],
		}),
	)
	.addCommand(listInvoicesCmd, { isDefault: true })
	.addCommand(getInvoiceCmd)
	.addCommand(createInvoiceCmd);
