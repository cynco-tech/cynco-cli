import { readFileSync } from 'node:fs';
import type { GlobalOpts } from './client';
import { outputError } from './output';

export function readFile(filePath: string, globalOpts: GlobalOpts): string {
	try {
		return readFileSync(filePath, 'utf-8');
	} catch {
		outputError(
			{ message: `Failed to read file: ${filePath}`, code: 'file_read_error' },
			{ json: globalOpts.json },
		);
	}
}
