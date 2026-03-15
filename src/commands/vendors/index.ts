import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { createVendorCmd } from './create';
import { deleteVendorCmd } from './delete';
import { getVendorCmd } from './get';
import { listVendorsCmd } from './list';
import { updateVendorCmd } from './update';

export const vendorsCmd = new Command('vendors')
	.description('Manage vendors')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco vendors list',
				'cynco vendors get vend_abc123',
				'cynco vendors create --name "Supplier Co"',
				'cynco vendors update vend_abc123 --name "New Name"',
				'cynco vendors delete vend_abc123',
			],
		}),
	)
	.addCommand(listVendorsCmd, { isDefault: true })
	.addCommand(getVendorCmd)
	.addCommand(createVendorCmd)
	.addCommand(updateVendorCmd)
	.addCommand(deleteVendorCmd);
