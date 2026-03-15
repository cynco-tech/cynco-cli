# Changelog

## [0.2.0] - 2026-03-15

### Added

- `cynco extract <file>` — AI-powered document extraction (PDF, PNG, JPG). The CLI's signature command.
- `cynco cash` — one-word cash position with currency-grouped totals
- `cynco invoices overdue` — overdue invoices with aging buckets (1-30, 31-60, 61-90, 90+)
- `cynco tb` / `cynco bs` / `cynco pl` / `cynco ar` / `cynco ap` — two-letter report shortcuts
- `cynco invoices finalize <id>` — finalize a draft invoice
- `cynco invoices send <id>` — email invoice to customer
- `cynco invoices void <id>` — void an invoice with confirmation
- `cynco invoices record-payment <id>` — record payment against an invoice
- `cynco bank-transactions import <file>` — import CSV/OFX/QIF bank statements with dry-run support
- `cynco journal-entries batch --file <file>` — batch create from JSON with partial success reporting
- `cynco webhooks listen` — local dev webhook listener with auto-cleanup
- `cynco reconcile` — bank reconciliation status (book vs bank balance)
- `CyncoClient.upload()` — multipart/FormData support for file uploads

### Changed

- Centralized `statusIndicator`, `formatPercent`, TICK/CROSS/WARN symbols into shared lib modules
- Removed 6 redundant format aliases (`formatCurrency`, `formatAmount`, `formatBalance`)
- `client.ts` refactored with shared `parseResponse()`, `authHeaders()`, `buildUrl()` helpers
- `readFileAsFormData()` helper eliminates TOCTOU file validation pattern
- Help examples now lead with `extract`, `cash`, `overdue`, `tb`

### Fixed

- `webhooks update` now validates at least one field is provided
- `api-keys create` uses existing `validateScopes()` instead of inline reimplementation
- Zero debit/credit values no longer hidden by truthy check in journal entries
- Raw ANSI codes in update-check replaced with `picocolors`
- 47 lint warnings resolved (unused imports, non-null assertions)

---

## [0.1.0] - 2026-03-15

### Added

- `cynco login` / `cynco logout` — authenticate with browser auth flow or API key
- Multi-profile support: `cynco auth list`, `switch`, `rename`, `remove`
- `cynco invoices` — list, get, create
- `cynco customers` — full CRUD (list, get, create, update, delete)
- `cynco vendors` — full CRUD (list, get, create, update, delete)
- `cynco bills` — list, get, create
- `cynco items` — full CRUD (list, get, create, update, delete)
- `cynco accounts` — list, get (read-only)
- `cynco journal-entries` — list, get, create
- `cynco bank-accounts` — list, get (read-only)
- `cynco bank-transactions` — list, get (read-only)
- `cynco api-keys` — create, list, delete
- `cynco webhooks` — full CRUD (list, get, create, update, delete)
- `cynco reports generate` — 7 report types (trial_balance, balance_sheet, income_statement, cash_flow, general_ledger, aged_receivables, aged_payables)
- `cynco doctor` — CLI health check (version, API key, connectivity)
- `cynco whoami` — show current authenticated profile
- `cynco update` — check for new CLI versions
- `cynco open` — open Cynco pages in browser
- Auto JSON output when stdout is not a TTY (`--json`, `--quiet`)
- Shared pagination (`--limit`, `--cursor`) on all list commands
- Interactive prompts for missing required fields
- Cross-platform binaries for macOS, Linux, and Windows via GitHub Actions
