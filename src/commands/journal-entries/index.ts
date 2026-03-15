import { Command } from '@commander-js/extra-typings';
import { batchCmd } from './batch';
import { createCmd } from './create';
import { getCmd } from './get';
import { listCmd } from './list';

export const journalEntriesCmd = new Command('journal-entries')
	.alias('je')
	.description('Manage journal entries')
	.addCommand(listCmd, { isDefault: true })
	.addCommand(getCmd)
	.addCommand(createCmd)
	.addCommand(batchCmd);
