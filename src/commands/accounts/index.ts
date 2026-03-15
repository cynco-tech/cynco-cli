import { Command } from '@commander-js/extra-typings';
import { getCmd } from './get';
import { listCmd } from './list';

export const accountsCmd = new Command('accounts')
	.description('Manage chart of accounts')
	.addCommand(listCmd, { isDefault: true })
	.addCommand(getCmd);
