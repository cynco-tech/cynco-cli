/**
 * Shared mock data for CLI tests.
 *
 * Shapes match the interfaces in src/commands/<resource>/utils.ts.
 * Import from here instead of redefining mocks per test file.
 */

// ── Pagination ──────────────────────────────────────────────────────

export const mockPagination = {
	page: 1,
	limit: 20,
	total: 2,
	totalPages: 1,
	hasMore: false,
} as const;

export function paginationOf(total: number, page = 1, limit = 20) {
	return {
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
		hasMore: page < Math.ceil(total / limit),
	};
}

// ── Invoices ────────────────────────────────────────────────────────

export const mockInvoices = [
	{
		id: 'inv_001',
		invoiceNumber: 'INV-001',
		customerName: 'Acme Corp',
		status: 'paid',
		total: 1500.0,
		currency: 'MYR',
		dueDate: '2026-04-01',
		createdAt: '2026-03-01',
	},
	{
		id: 'inv_002',
		invoiceNumber: 'INV-002',
		customerName: 'Beta Inc',
		status: 'draft',
		total: 800.0,
		currency: 'USD',
		dueDate: '2026-04-15',
		createdAt: '2026-03-10',
	},
] as const;

export const mockInvoice = mockInvoices[0];

// ── Customers ───────────────────────────────────────────────────────

export const mockCustomers = [
	{
		id: 'cust_001',
		name: 'Acme Corp',
		email: 'acme@example.com',
		phone: '+60123456789',
		country: 'MY',
		createdAt: '2026-03-01',
	},
	{
		id: 'cust_002',
		name: 'Beta Inc',
		email: 'beta@example.com',
		phone: '+11234567890',
		country: 'US',
		createdAt: '2026-03-05',
	},
] as const;

export const mockCustomer = mockCustomers[0];

// ── Vendors ─────────────────────────────────────────────────────────

export const mockVendors = [
	{
		id: 'vnd_001',
		name: 'Supplier Co',
		email: 'supplier@example.com',
		phone: '+60198765432',
		country: 'MY',
		createdAt: '2026-03-01',
	},
	{
		id: 'vnd_002',
		name: 'Parts Ltd',
		email: 'parts@example.com',
		phone: '+442012345678',
		country: 'GB',
		createdAt: '2026-03-08',
	},
] as const;

export const mockVendor = mockVendors[0];

// ── Bills ───────────────────────────────────────────────────────────

export const mockBills = [
	{
		id: 'bill_001',
		billNumber: 'BILL-001',
		vendorName: 'Supplier Co',
		status: 'pending',
		total: 3200.0,
		currency: 'MYR',
		dueDate: '2026-04-10',
		createdAt: '2026-03-01',
	},
	{
		id: 'bill_002',
		billNumber: 'BILL-002',
		vendorName: 'Parts Ltd',
		status: 'paid',
		total: 450.0,
		currency: 'USD',
		dueDate: '2026-03-20',
		createdAt: '2026-03-05',
	},
] as const;

export const mockBill = mockBills[0];

// ── Items ───────────────────────────────────────────────────────────

export const mockItems = [
	{
		id: 'item_001',
		name: 'Widget A',
		description: 'Standard widget',
		unitPrice: 50.0,
		taxRate: 6,
		createdAt: '2026-03-01',
	},
	{
		id: 'item_002',
		name: 'Service B',
		description: 'Consulting service',
		unitPrice: 200.0,
		taxRate: 0,
		createdAt: '2026-03-10',
	},
] as const;

export const mockItem = mockItems[0];

// ── Accounts ────────────────────────────────────────────────────────

export const mockAccounts = [
	{
		id: 'acc_001',
		code: '1000',
		name: 'Cash',
		type: 'asset',
		normalBalance: 'debit',
		isActive: true,
		description: 'Cash and equivalents',
		createdAt: '2026-01-01',
	},
	{
		id: 'acc_002',
		code: '2000',
		name: 'Accounts Payable',
		type: 'liability',
		normalBalance: 'credit',
		isActive: true,
		description: 'Trade payables',
		createdAt: '2026-01-01',
	},
] as const;

export const mockAccount = mockAccounts[0];

// ── Journal Entries ─────────────────────────────────────────────────

export const mockJournalEntries = [
	{
		id: 'je_001',
		entryNumber: 'JE-001',
		date: '2026-03-15',
		status: 'posted',
		description: 'Office supplies purchase',
		totalDebit: 500.0,
		totalCredit: 500.0,
		memo: 'Monthly supplies',
		createdAt: '2026-03-15',
		lines: [
			{ accountId: 'acc_001', accountName: 'Office Supplies', debit: 500, credit: 0 },
			{ accountId: 'acc_002', accountName: 'Cash', debit: 0, credit: 500 },
		],
	},
] as const;

export const mockJournalEntry = mockJournalEntries[0];

// ── Bank Accounts ───────────────────────────────────────────────────

export const mockBankAccounts = [
	{
		id: 'ba_001',
		name: 'Maybank Current',
		accountType: 'checking',
		currency: 'MYR',
		balance: 45230.0,
		institutionName: 'Maybank',
		accountNumber: '1234567890',
		createdAt: '2026-01-01',
	},
	{
		id: 'ba_002',
		name: 'HSBC USD',
		accountType: 'checking',
		currency: 'USD',
		balance: 12100.0,
		institutionName: 'HSBC',
		accountNumber: '9876543210',
		createdAt: '2026-01-15',
	},
] as const;

export const mockBankAccount = mockBankAccounts[0];

// ── Bank Transactions ───────────────────────────────────────────────

export const mockBankTransactions = [
	{
		id: 'bt_001',
		date: '2026-03-15',
		description: 'Client payment received',
		amount: 5000.0,
		type: 'credit',
		status: 'reconciled',
		accountName: 'Maybank Current',
		currency: 'MYR',
		createdAt: '2026-03-15',
	},
	{
		id: 'bt_002',
		date: '2026-03-16',
		description: 'Vendor payment',
		amount: -1200.0,
		type: 'debit',
		status: 'pending',
		accountName: 'Maybank Current',
		currency: 'MYR',
		createdAt: '2026-03-16',
	},
] as const;

export const mockBankTransaction = mockBankTransactions[0];

// ── Webhooks ────────────────────────────────────────────────────────

export const mockWebhooks = [
	{
		id: 'wh_001',
		url: 'https://example.com/webhooks',
		events: ['invoice.created', 'invoice.paid'],
		active: true,
		createdAt: '2026-03-01',
	},
	{
		id: 'wh_002',
		url: 'https://staging.example.com/hooks',
		events: ['customer.created'],
		active: false,
		createdAt: '2026-03-10',
	},
] as const;

export const mockWebhook = mockWebhooks[0];

// ── API Keys ────────────────────────────────────────────────────────

export const mockApiKeys = [
	{
		id: 'key_001',
		name: 'Production Key',
		keyPrefix: 'cak_prod',
		scopes: ['*'],
		lastUsedAt: '2026-03-15',
		createdAt: '2026-02-01',
	},
	{
		id: 'key_002',
		name: 'CI Key',
		keyPrefix: 'cak_ci',
		scopes: ['invoices:read', 'customers:read'],
		lastUsedAt: null,
		createdAt: '2026-03-01',
	},
] as const;

export const mockApiKey = mockApiKeys[0];

// ── Reports ─────────────────────────────────────────────────────────

export const mockReportData = {
	type: 'trial_balance',
	period: '2026-03',
	generatedAt: '2026-03-31T23:59:59Z',
	rows: [
		{ accountCode: '1000', accountName: 'Cash', debit: 45230.0, credit: 0 },
		{ accountCode: '2000', accountName: 'Accounts Payable', debit: 0, credit: 12000.0 },
	],
	summary: {
		totalDebit: 45230.0,
		totalCredit: 12000.0,
	},
} as const;
