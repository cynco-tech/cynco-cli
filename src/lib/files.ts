import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
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

export function readFileAsFormData(
	filePath: string,
	supportedExtensions: readonly string[],
	globalOpts: GlobalOpts,
): { formData: FormData; fileName: string; ext: string } {
	const absPath = resolve(filePath);
	const ext = extname(absPath).toLowerCase();

	if (!supportedExtensions.includes(ext)) {
		outputError(
			{
				message: `Unsupported file type "${ext}". Supported: ${supportedExtensions.join(', ')}`,
				code: 'unsupported_format',
			},
			{ json: globalOpts.json },
		);
	}

	let fileBuffer: Buffer;
	try {
		fileBuffer = readFileSync(absPath);
	} catch {
		outputError(
			{ message: `Failed to read file: ${filePath}`, code: 'file_read_error' },
			{ json: globalOpts.json },
		);
	}

	const fileName = basename(absPath);
	const formData = new FormData();
	formData.set('file', new Blob([new Uint8Array(fileBuffer)]), fileName);

	return { formData, fileName, ext };
}
