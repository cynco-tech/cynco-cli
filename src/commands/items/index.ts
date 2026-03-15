import { Command } from '@commander-js/extra-typings';
import { createItemCmd } from './create';
import { deleteItemCmd } from './delete';
import { getItemCmd } from './get';
import { listItemsCmd } from './list';
import { updateItemCmd } from './update';

export const itemsCmd = new Command('items')
	.description('Manage line item master data')
	.addCommand(listItemsCmd, { isDefault: true })
	.addCommand(getItemCmd)
	.addCommand(createItemCmd)
	.addCommand(updateItemCmd)
	.addCommand(deleteItemCmd);
