import { Command } from '@commander-js/extra-typings';
import { getCmd } from './get';
import { listCmd } from './list';

export const bankTransactionsCmd = new Command('bank-transactions')
	.alias('txns')
	.description('View bank transactions')
	.addCommand(listCmd, { isDefault: true })
	.addCommand(getCmd);
