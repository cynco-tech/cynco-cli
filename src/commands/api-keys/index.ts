import { Command } from '@commander-js/extra-typings';
import { createApiKeyCmd } from './create';
import { deleteApiKeyCmd } from './delete';
import { listApiKeysCmd } from './list';

export const apiKeysCmd = new Command('api-keys')
	.description('Manage API keys')
	.addCommand(listApiKeysCmd, { isDefault: true })
	.addCommand(createApiKeyCmd)
	.addCommand(deleteApiKeyCmd);
