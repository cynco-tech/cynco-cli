import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from './config';

const MAX_ENTRIES = 1000;

export type HistoryEntry = {
	timestamp: string;
	command: string;
	exitCode: number;
	durationMs: number;
};

function getHistoryPath(): string {
	return join(getConfigDir(), 'history.jsonl');
}

export function appendHistory(entry: HistoryEntry): void {
	try {
		const dir = getConfigDir();
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true, mode: 0o700 });
		}
		const path = getHistoryPath();
		appendFileSync(path, `${JSON.stringify(entry)}\n`, 'utf-8');
		// Rotate if over limit
		rotateIfNeeded(path);
	} catch {
		// History logging is best-effort — never block the CLI
	}
}

function rotateIfNeeded(path: string): void {
	try {
		const content = readFileSync(path, 'utf-8');
		const lines = content.trim().split('\n');
		if (lines.length > MAX_ENTRIES) {
			const trimmed = lines.slice(lines.length - MAX_ENTRIES).join('\n');
			writeFileSync(path, `${trimmed}\n`, 'utf-8');
		}
	} catch {
		// Ignore rotation errors
	}
}

export function readHistory(limit = 20): HistoryEntry[] {
	if (limit <= 0) return [];
	const path = getHistoryPath();
	if (!existsSync(path)) return [];
	try {
		const content = readFileSync(path, 'utf-8').trim();
		if (!content) return [];
		const lines = content.split('\n');
		const entries: HistoryEntry[] = [];
		for (const line of lines) {
			try {
				entries.push(JSON.parse(line) as HistoryEntry);
			} catch {
				// Skip malformed lines
			}
		}
		return entries.slice(-limit);
	} catch {
		return [];
	}
}

export function clearHistory(): void {
	const path = getHistoryPath();
	if (existsSync(path)) {
		unlinkSync(path);
	}
}
