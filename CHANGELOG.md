# Changelog

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
