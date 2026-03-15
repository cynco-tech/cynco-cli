# Cynco CLI

The official CLI for [Cynco](https://cynco.io) — AI Native Accounting.

Built for humans, AI agents, and CI/CD pipelines.

```
 ██████╗██╗   ██╗███╗   ██╗ ██████╗ ██████╗
██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝██╔═══██╗
██║      ╚████╔╝ ██╔██╗ ██║██║     ██║   ██║
██║       ╚██╔╝  ██║╚██╗██║██║     ██║   ██║
╚██████╗   ██║   ██║ ╚████║╚██████╗╚██████╔╝
 ╚═════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝
```

## Install

### cURL

```sh
curl -fsSL https://cynco.io/install.sh | bash
```

### Node.js

```sh
npm install -g cynco-cli
```

### PowerShell (Windows)

```sh
irm https://cynco.io/install.ps1 | iex
```

Or download the binary directly from the [GitHub releases page](https://github.com/cynco-tech/cynco-cli/releases/latest).

## Quick start

```bash
# Authenticate
cynco login

# Extract data from a document using AI
cynco extract ./invoice.pdf

# Show your cash position
cynco cash

# List overdue invoices with aging
cynco invoices overdue

# Generate a Trial Balance
cynco tb --period 2026-03

# Record a payment
cynco invoices record-payment inv_abc123 --amount 1500

# Import bank transactions
cynco bank-transactions import ./statement.csv --account-id fac_abc123

# Check your environment
cynco doctor
```

---

## Authentication

The CLI resolves your API key using the following priority chain:

| Priority | Source | How to set |
|----------|--------|------------|
| 1 (highest) | `--api-key` flag | `cynco --api-key cak_xxx invoices list` |
| 2 | `CYNCO_API_KEY` env var | `export CYNCO_API_KEY=cak_xxx` |
| 3 (lowest) | Config file | `cynco login` |

If no key is found from any source, the CLI errors with code `auth_error`.

### Multi-profile support

```bash
cynco login --profile production
cynco auth switch
cynco invoices list --profile production
```

---

## Commands

### AI & Extraction

#### `cynco extract <file>`

Extract structured data from a document using AI. Supports PDF, PNG, JPG, and other image formats.

```bash
cynco extract ./invoice.pdf
cynco extract ./receipt.jpg --type receipt
cynco extract ./statement.pdf --type bank_statement
cynco extract ./bill.pdf --json
```

| Flag | Description |
|------|-------------|
| `-t, --type <type>` | Document type: `auto`, `invoice`, `receipt`, `bank_statement`, `bill`, `purchase_order` (default: `auto`) |

---

### Quick Views

#### `cynco cash`

Show your cash position — all bank account balances with currency-grouped totals.

```bash
cynco cash
cynco cash --currency MYR
```

#### `cynco invoices overdue`

List overdue invoices with aging buckets (1-30, 31-60, 61-90, 90+ days).

```bash
cynco invoices overdue
cynco invoices overdue --limit 50
```

#### `cynco reconcile`

Bank reconciliation status — book balance vs bank balance comparison.

```bash
cynco reconcile --account-id fac_abc123
cynco reconcile --account-id fac_abc123 --period 2026-03
```

---

### Report Shortcuts

Two-letter shortcuts for the most common financial reports:

```bash
cynco tb --period 2026-03             # Trial Balance
cynco bs --period 2026-03             # Balance Sheet
cynco pl --period 2026-03             # Profit & Loss
cynco ar                              # Aged Receivables
cynco ap                              # Aged Payables
```

All support `--period <YYYY-MM>`, `--start-date`, and `--end-date` options.

---

### Invoice Lifecycle

```bash
cynco invoices create --customer-id cust_abc123        # Create draft
cynco invoices finalize inv_abc123                      # Draft → finalized
cynco invoices send inv_abc123                          # Email to customer
cynco invoices record-payment inv_abc123 --amount 1500  # Record payment
cynco invoices void inv_abc123                          # Void (irreversible)
```

#### `cynco invoices record-payment <id>`

| Flag | Description |
|------|-------------|
| `--amount <n>` | Payment amount (required) |
| `--date <YYYY-MM-DD>` | Payment date |
| `--method <method>` | Payment method: `cash`, `bank_transfer`, `card`, `cheque` |

---

### Bank Transactions

#### `cynco bank-transactions import <file>`

Import bank transactions from CSV, OFX, or QIF files.

```bash
cynco bank-transactions import ./statement.csv --account-id fac_abc123
cynco bank-transactions import ./may-2026.ofx --account-id fac_abc123
cynco bank-transactions import ./transactions.csv --account-id fac_abc123 --dry-run
```

| Flag | Description |
|------|-------------|
| `--account-id <id>` | Target bank account ID (required) |
| `--format <fmt>` | File format: `csv`, `ofx`, `qif`, `auto` (default: `auto`) |
| `--dry-run` | Validate without importing |

---

### Journal Entries

#### `cynco journal-entries batch --file <file>`

Batch create journal entries from a JSON file.

```bash
cynco journal-entries batch --file ./entries.json
cynco je batch -f ./month-end.json --dry-run
```

The JSON file should contain an array of journal entry objects, each with `date`, `description`, and `lines`.

---

### Webhooks

#### `cynco webhooks listen`

Start a local webhook listener for development. Creates a temporary webhook, displays events in real-time, and cleans up on Ctrl+C.

```bash
cynco webhooks listen --forward-url https://abc123.ngrok-free.app
cynco webhooks listen --forward-url https://abc123.ngrok-free.app --port 8080
cynco webhooks listen --forward-url https://tunnel.example.com --events "invoice.paid,payment.received"
```

Requires a tunnel (ngrok, cloudflared, etc.) to make localhost reachable.

---

### All commands

| Command | Description |
|---------|-------------|
| **AI & Extraction** | |
| `cynco extract <file>` | Extract data from a document using AI |
| **Quick Views** | |
| `cynco cash` | Show cash position — all bank account balances |
| `cynco reconcile` | Bank reconciliation status |
| **Report Shortcuts** | |
| `cynco tb` | Trial Balance |
| `cynco bs` | Balance Sheet |
| `cynco pl` | Profit & Loss (Income Statement) |
| `cynco ar` | Aged Receivables |
| `cynco ap` | Aged Payables |
| **Auth** | |
| `cynco login` | Log in to your Cynco account |
| `cynco logout` | Log out and remove stored credentials |
| `cynco auth list` | List stored profiles |
| `cynco auth switch` | Switch active profile |
| `cynco auth rename` | Rename a profile |
| `cynco auth remove` | Remove a profile |
| **Invoices** | |
| `cynco invoices list` | List invoices |
| `cynco invoices get <id>` | Get invoice details |
| `cynco invoices create` | Create an invoice |
| `cynco invoices overdue` | List overdue invoices with aging |
| `cynco invoices finalize <id>` | Finalize a draft invoice |
| `cynco invoices send <id>` | Send invoice to customer |
| `cynco invoices void <id>` | Void an invoice |
| `cynco invoices record-payment <id>` | Record a payment |
| **Customers** | |
| `cynco customers list` | List customers |
| `cynco customers get <id>` | Get customer details |
| `cynco customers create` | Create a customer |
| `cynco customers update <id>` | Update a customer |
| `cynco customers delete <id>` | Delete a customer |
| **Vendors** | |
| `cynco vendors list` | List vendors |
| `cynco vendors get <id>` | Get vendor details |
| `cynco vendors create` | Create a vendor |
| `cynco vendors update <id>` | Update a vendor |
| `cynco vendors delete <id>` | Delete a vendor |
| **Bills** | |
| `cynco bills list` | List bills |
| `cynco bills get <id>` | Get bill details |
| `cynco bills create` | Create a bill |
| **Items** | |
| `cynco items list` | List items |
| `cynco items get <id>` | Get item details |
| `cynco items create` | Create an item |
| `cynco items update <id>` | Update an item |
| `cynco items delete <id>` | Delete an item |
| **Accounting** | |
| `cynco accounts list` | List chart of accounts |
| `cynco accounts get <id>` | Get account details |
| `cynco journal-entries list` | List journal entries |
| `cynco journal-entries get <id>` | Get journal entry details |
| `cynco journal-entries create` | Create a journal entry |
| `cynco journal-entries batch` | Batch create from JSON file |
| **Banking** | |
| `cynco bank-accounts list` | List bank accounts |
| `cynco bank-accounts get <id>` | Get bank account details |
| `cynco bank-transactions list` | List bank transactions |
| `cynco bank-transactions get <id>` | Get bank transaction details |
| `cynco bank-transactions import <file>` | Import from CSV/OFX/QIF |
| **Platform** | |
| `cynco api-keys list` | List API keys |
| `cynco api-keys create` | Create an API key |
| `cynco api-keys delete <id>` | Delete an API key |
| `cynco webhooks list` | List webhooks |
| `cynco webhooks get <id>` | Get webhook details |
| `cynco webhooks create` | Create a webhook |
| `cynco webhooks update <id>` | Update a webhook |
| `cynco webhooks delete <id>` | Delete a webhook |
| `cynco webhooks listen` | Local webhook listener for dev |
| **Reports** | |
| `cynco reports generate` | Generate a financial report |
| **Utilities** | |
| `cynco doctor` | Run environment diagnostics |
| `cynco open <page>` | Open Cynco pages in browser |
| `cynco whoami` | Show current authenticated profile |
| `cynco update` | Check for CLI updates |

---

## Global options

```bash
cynco [global options] <command> [command options]
```

| Flag | Description |
|------|-------------|
| `--api-key <key>` | Override API key for this invocation (takes highest priority) |
| `-p, --profile <name>` | Profile to use (overrides `CYNCO_PROFILE` env var) |
| `--json` | Force JSON output even in interactive terminals |
| `-q, --quiet` | Suppress spinners and status output (implies `--json`) |
| `-v, --version` | Print version and exit |
| `--help` | Show help text |

---

## Output behavior

The CLI has two output modes:

| Mode | When | Stdout | Stderr |
|------|------|--------|--------|
| **Interactive** | Terminal (TTY) | Formatted text | Spinners, prompts |
| **Machine** | Piped, CI, or `--json` | JSON | Nothing |

Switching is automatic — pipe to another command and JSON output activates:

```bash
cynco cash --json | jq '.totals'
cynco invoices overdue | jq '.[].customerName'
```

### Error output

Errors always exit with code `1` and output structured JSON to stdout:

```json
{ "error": { "message": "No API key found", "code": "auth_error" } }
```

---

## Agent & CI/CD usage

### CI/CD

Set `CYNCO_API_KEY` as an environment variable — no `cynco login` needed:

```yaml
# GitHub Actions
env:
  CYNCO_API_KEY: ${{ secrets.CYNCO_API_KEY }}
steps:
  - run: cynco tb --period 2026-03 --json > trial-balance.json
  - run: cynco invoices overdue --json | jq '.invoices | length'
```

### AI agents

Agents calling the CLI as a subprocess automatically get JSON output (non-TTY detection). The contract:

- **Input:** All required flags must be provided (no interactive prompts)
- **Output:** JSON to stdout, nothing to stderr
- **Exit code:** `0` success, `1` error
- **Errors:** Always include `message` and `code` fields

---

## Local development

### Prerequisites

- [Node.js](https://nodejs.org) 20+

### Setup

```bash
git clone https://github.com/cynco-tech/cynco-cli.git
cd cynco-cli
pnpm install
pnpm build        # Output: ./dist/cli.cjs
pnpm dev --help   # Run in dev mode
pnpm build:bin    # Build standalone binary → ./dist/cynco
```

---

## Configuration

| Item | Path | Notes |
|------|------|-------|
| Config directory | `~/.config/cynco/` | Respects `$XDG_CONFIG_HOME` on Linux, `%APPDATA%` on Windows |
| Credentials | `~/.config/cynco/credentials.json` | `0600` permissions (owner read/write) |
| Install directory | `~/.cynco/bin/` | Respects `$CYNCO_INSTALL` |

## License

MIT
