import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { createCustomerCmd } from './create';
import { deleteCustomerCmd } from './delete';
import { getCustomerCmd } from './get';
import { listCustomersCmd } from './list';
import { updateCustomerCmd } from './update';

export const customersCmd = new Command('customers')
	.description('Manage customers')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco customers list',
				'cynco customers get cust_abc123',
				'cynco customers create --name "Acme Corp"',
				'cynco customers update cust_abc123 --name "New Name"',
				'cynco customers delete cust_abc123',
			],
		}),
	)
	.addCommand(listCustomersCmd, { isDefault: true })
	.addCommand(getCustomerCmd)
	.addCommand(createCustomerCmd)
	.addCommand(updateCustomerCmd)
	.addCommand(deleteCustomerCmd);
