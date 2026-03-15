import { Command } from '@commander-js/extra-typings';
import { getCmd } from './get';
import { listCmd } from './list';

export const bankAccountsCmd = new Command('bank-accounts')
	.description('Manage bank & financial accounts')
	.addCommand(listCmd, { isDefault: true })
	.addCommand(getCmd);
