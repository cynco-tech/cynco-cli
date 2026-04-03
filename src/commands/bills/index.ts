import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { createBillCmd } from './create';
import { deleteBillCmd } from './delete';
import { getBillCmd } from './get';
import { listBillsCmd } from './list';
import { updateBillCmd } from './update';

export const billsCmd = new Command('bills')
	.description('Manage bills')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bills list',
				'cynco bills get bill_abc123',
				'cynco bills create --vendor-id vend_abc123',
				'cynco bills update bill_abc123 --status finalized',
				'cynco bills delete bill_abc123',
			],
		}),
	)
	.addCommand(listBillsCmd, { isDefault: true })
	.addCommand(getBillCmd)
	.addCommand(createBillCmd)
	.addCommand(updateBillCmd)
	.addCommand(deleteBillCmd);
