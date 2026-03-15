import { Command } from '@commander-js/extra-typings';
import { getCmd } from './get';
import { importCmd } from './import';
import { listCmd } from './list';

export const bankTransactionsCmd = new Command('bank-transactions')
	.alias('txns')
	.description('Manage bank transactions')
	.addCommand(listCmd, { isDefault: true })
	.addCommand(getCmd)
	.addCommand(importCmd);
