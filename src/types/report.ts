export interface ReportData {
	type: string;
	period?: string;
	startDate?: string;
	endDate?: string;
	generatedAt?: string;
	rows?: Array<Record<string, unknown>>;
	summary?: Record<string, unknown>;
	[key: string]: unknown;
}
