import type { GlobalOpts } from './client';
import { outputError } from './output';
import type { LineItemInput } from './prompts';

export function validateLineItems(items: unknown, globalOpts: GlobalOpts): LineItemInput[] {
	if (!Array.isArray(items)) {
		outputError(
			{ message: '--items must be a JSON array', code: 'invalid_items' },
			{ json: globalOpts.json },
		);
	}
	for (let i = 0; i < items.length; i++) {
		const item = items[i] as Record<string, unknown>;
		if (!item.description || typeof item.description !== 'string') {
			outputError(
				{ message: `Item ${i + 1}: description is required (string)`, code: 'invalid_items' },
				{ json: globalOpts.json },
			);
		}
		if (typeof item.quantity !== 'number' || item.quantity <= 0) {
			outputError(
				{ message: `Item ${i + 1}: quantity must be a positive number`, code: 'invalid_items' },
				{ json: globalOpts.json },
			);
		}
		if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
			outputError(
				{
					message: `Item ${i + 1}: unitPrice must be zero or a positive number`,
					code: 'invalid_items',
				},
				{ json: globalOpts.json },
			);
		}
	}
	return items as LineItemInput[];
}
