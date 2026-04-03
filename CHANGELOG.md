# Changelog

## [0.3.0] - 2026-04-03

### Added

- **Agent-first design** — `--agent` flag and `CYNCO_AGENT=1` env var for unified machine-readable mode
- **`--stdin` support** — all create/update commands accept piped JSON bodies with flag override
- **`--dry-run` flag** — preview destructive operations (delete, void, send, finalize, batch) without executing
- **Smart error hints** — API validation errors map field names to CLI flags (e.g. `customerId` -> `--customer-id`)
- **MCP server mode** — `cynco mcp serve` exposes all commands as MCP tools, auto-generated from Commander tree
- **`cynco config`** — persistent settings (`output.format`, `defaults.currency`, `api.timeout`, etc.)
- **`cynco history`** — command audit trail with timestamps, exit codes, and duration
- **Smart pipe chains** — `cynco invoices list --json | cynco invoices batch-send --stdin` works out of the box
- **Progress bars** — batch operations show `[████░░░░] 47/100` instead of spinners
- **Colored diff preview** — update commands show before/after comparison in `--dry-run` mode
- **`--token-stdin`** on login — pipe API keys for CI/automation

### Changed

- **Branded visual identity** — ASCII block logo on bare `cynco` command, session bar with version/profile/key
- **Borderless tables** — replaced box-drawing tables with clean whitespace-aligned layout
- **Status dots** — `● paid`, `● draft`, `● overdue`, `○ void` replace raw colored text
- **Detail view renderer** — consistent dim-label/bold-value pattern for single-resource display
- **Stderr discipline** — all progress/decorative output to stderr, stdout reserved for data only
- **Post-login onboarding** — "What's next?" suggestions after successful authentication
- **First-run detection** — bare `cynco` shows welcome message when not authenticated
- **Refined doctor** — aligned labels, cleaner output
- **Refined whoami** — dim key-value layout
- **Refined status dashboard** — cleaner section headers, better alignment

## [0.2.0] - 2026-03-20

### Added

- **Shared API types** — 14 type files, centralized response shapes
- **`--verbose` flag** — request/response debug logging to stderr
- **`-o, --output` flag** — table, json, csv output formats
- **CSV export** — all list commands support `-o csv`
- **Line items** — `--items` on invoices/bills create (inline JSON, `@file.json`, interactive)
- **Search & filtering** — `--search`, `--from`/`--to`, resource-specific filters on 8 list commands
- **Empty state guidance** — contextual suggestions when results are empty
- **`cynco status`** — business health dashboard (cash, overdue, upcoming bills)
- **`cynco cash`** — cash position across all bank accounts
- **Enhanced doctor** — 7 checks (Node.js, version, API key, permissions, connectivity, latency, API version)
- **API version header** — `Cynco-API-Version: 2026-04-01` on all requests
- **Webhook signatures** — `--secret` and `--no-verify` on `webhooks listen`
- **Shell completions** — `cynco completion install` for bash, zsh, fish
- **Batch operations** — `batch-send`, `batch-finalize`, `batch-void` with concurrency control
- **Report shortcuts** — `cynco tb`, `bs`, `pl`, `ar`, `ap`
- **Overdue aging** — aging bucket summary (1-30, 31-60, 61-90, 90+ days)
- **Test coverage** — 286 tests across 81 test files (~70% line coverage)

## [0.1.0] - 2026-03-15

### Added

- `cynco login` / `cynco logout` — authenticate with browser auth flow or API key
- Multi-profile support: `cynco auth list`, `switch`, `rename`, `remove`
- `cynco invoices` — list, get, create, send, void, finalize, record-payment
- `cynco customers` — full CRUD
- `cynco vendors` — full CRUD
- `cynco bills` — list, get, create, update, delete
- `cynco items` — full CRUD
- `cynco accounts` — list, get
- `cynco journal-entries` — list, get, create
- `cynco bank-accounts` — list, get
- `cynco bank-transactions` — list, get, import
- `cynco api-keys` — create, list, delete
- `cynco webhooks` — full CRUD + listen
- `cynco reports generate` — 7 report types
- `cynco doctor` — CLI health check
- `cynco whoami` — current profile
- `cynco open` — open dashboard in browser
- `cynco update` — check for updates
- Auto JSON output when piped
- Interactive prompts for missing fields
- Cross-platform binaries (macOS, Linux, Windows)
