import { Command } from '@commander-js/extra-typings';
import { createWebhookCmd } from './create';
import { deleteWebhookCmd } from './delete';
import { getWebhookCmd } from './get';
import { listWebhooksCmd } from './list';
import { listenCmd } from './listen';
import { updateWebhookCmd } from './update';

export const webhooksCmd = new Command('webhooks')
	.description('Manage webhook endpoints')
	.addCommand(listWebhooksCmd, { isDefault: true })
	.addCommand(getWebhookCmd)
	.addCommand(createWebhookCmd)
	.addCommand(updateWebhookCmd)
	.addCommand(deleteWebhookCmd)
	.addCommand(listenCmd);
