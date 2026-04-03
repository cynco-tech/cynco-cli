function escapeCsvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
	const lines = [headers.map(escapeCsvField).join(',')];
	for (const row of rows) {
		lines.push(row.map(escapeCsvField).join(','));
	}
	return lines.join('\n');
}
