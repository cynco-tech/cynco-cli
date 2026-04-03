import { describe, expect, it } from 'vitest';
import { accountTypeLabel, renderAccountsTable } from '../../src/commands/accounts/utils';
import { renderApiKeysTable, validateScopes } from '../../src/commands/api-keys/utils';
import { renderBankAccountsTable } from '../../src/commands/bank-accounts/utils';
import { renderTransactionsTable } from '../../src/commands/bank-transactions/utils';
import { renderBillsTable } from '../../src/commands/bills/utils';
import { renderCustomersTable } from '../../src/commands/customers/utils';
import { renderInvoicesTable } from '../../src/commands/invoices/utils';
import { renderItemsTable } from '../../src/commands/items/utils';
import {
	renderJournalEntriesTable,
	statusIndicator,
} from '../../src/commands/journal-entries/utils';
import { renderVendorsTable } from '../../src/commands/vendors/utils';
import { renderWebhooksTable } from '../../src/commands/webhooks/utils';

describe('render utils', () => {
	it('renderInvoicesTable renders rows', () => {
		const result = renderInvoicesTable([
			{
				id: 'inv_001',
				invoiceNumber: 'INV-001',
				customerName: 'Acme',
				status: 'paid',
				total: 1000,
				currency: 'MYR',
				dueDate: '2026-04-01',
			},
		]);
		expect(result).toContain('INV-001');
		expect(result).toContain('Acme');
	});

	it('renderInvoicesTable shows empty message', () => {
		const result = renderInvoicesTable([]);
		expect(result).toContain('No invoices found');
	});

	it('renderCustomersTable renders rows', () => {
		const result = renderCustomersTable([
			{ id: 'cust_001', name: 'Acme', email: 'a@b.com', phone: '+60', country: 'MY' },
		]);
		expect(result).toContain('Acme');
		expect(result).toContain('a@b.com');
	});

	it('renderCustomersTable shows empty message', () => {
		const result = renderCustomersTable([]);
		expect(result).toContain('No customers found');
	});

	it('renderItemsTable renders rows', () => {
		const result = renderItemsTable([{ id: 'itm_001', name: 'Widget', unitPrice: 9.99 }]);
		expect(result).toContain('Widget');
	});

	it('renderVendorsTable renders rows', () => {
		const result = renderVendorsTable([{ id: 'vend_001', name: 'Supplier', email: 'sup@co.com' }]);
		expect(result).toContain('Supplier');
	});

	it('renderWebhooksTable renders rows', () => {
		const result = renderWebhooksTable([
			{ id: 'wh_001', url: 'https://hook.com', events: ['invoice.paid'], active: true },
		]);
		expect(result).toContain('https://hook.com');
	});

	it('renderApiKeysTable renders rows', () => {
		const result = renderApiKeysTable([
			{ id: 'api_001', name: 'CI', keyPrefix: 'cak_live', scopes: ['invoices:read'] },
		]);
		expect(result).toContain('CI');
		expect(result).toContain('cak_live');
	});

	it('renderBillsTable renders rows', () => {
		const result = renderBillsTable([
			{
				id: 'bill_001',
				billNumber: 'BILL-001',
				vendorName: 'Vendor',
				status: 'pending',
				total: 500,
				currency: 'MYR',
			},
		]);
		expect(result).toContain('BILL-001');
		expect(result).toContain('Vendor');
	});

	it('renderBankAccountsTable renders rows', () => {
		const result = renderBankAccountsTable([
			{ id: 'fac_001', name: 'Maybank', accountType: 'current', currency: 'MYR', balance: 45230 },
		]);
		expect(result).toContain('Maybank');
	});

	it('renderTransactionsTable renders rows', () => {
		const result = renderTransactionsTable([
			{
				id: 'btx_001',
				date: '2026-03-15',
				description: 'Payment',
				amount: 1500,
				currency: 'MYR',
				type: 'credit',
				status: 'reconciled',
			},
		]);
		expect(result).toContain('Payment');
	});

	it('renderJournalEntriesTable renders rows', () => {
		const result = renderJournalEntriesTable([
			{
				id: 'jnl_001',
				entryNumber: 'JE-001',
				date: '2026-03-15',
				status: 'posted',
				description: 'Test',
			},
		]);
		expect(result).toContain('JE-001');
	});

	it('renderAccountsTable renders rows', () => {
		const result = renderAccountsTable([
			{
				id: 'coa_001',
				name: 'Cash',
				code: '1010',
				type: 'asset',
				normalBalance: 'debit',
				isActive: true,
			},
		]);
		expect(result).toContain('Cash');
		expect(result).toContain('1010');
	});

	it('accountTypeLabel returns colored label for known types', () => {
		expect(accountTypeLabel('asset')).toContain('asset');
		expect(accountTypeLabel('liability')).toContain('liability');
		expect(accountTypeLabel('equity')).toContain('equity');
		expect(accountTypeLabel('revenue')).toContain('revenue');
		expect(accountTypeLabel('expense')).toContain('expense');
	});

	it('accountTypeLabel returns dash for undefined', () => {
		expect(accountTypeLabel(undefined)).toBe('-');
	});

	it('statusIndicator for journal entries handles reversed', () => {
		const result = statusIndicator('reversed');
		expect(result).toContain('reversed');
	});
});

describe('validateScopes', () => {
	it('accepts valid scopes', () => {
		const result = validateScopes('invoices:read,customers:write');
		expect(result).toEqual(['invoices:read', 'customers:write']);
	});

	it('accepts wildcard scope', () => {
		const result = validateScopes('*');
		expect(result).toEqual(['*']);
	});

	it('throws on invalid scope', () => {
		expect(() => validateScopes('invalid_scope')).toThrow('Invalid scopes');
	});

	it('trims whitespace from scopes', () => {
		const result = validateScopes('invoices:read , customers:read');
		expect(result).toEqual(['invoices:read', 'customers:read']);
	});
});
