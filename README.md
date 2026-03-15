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

## Local development

Use this when you want to change the CLI and run your build locally.

### Prerequisites

- [Node.js](https://nodejs.org) 20+

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/cynco-tech/cynco-cli.git
   cd cynco-cli
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build locally**

   ```bash
   pnpm build
   ```

   Output: `./dist/cli.cjs`

### Running the CLI locally

Use the dev script:

```bash
pnpm dev --version
```

Or run the built JS bundle:

```bash
node dist/cli.cjs --version
```

### Making changes

After editing source files, rebuild:

```bash
pnpm build
```

### Building native binaries

To build a standalone native binary:

```bash
pnpm build:bin
```

Output: `./dist/cynco`

## Quick start

```bash
# Authenticate
cynco login

# List your invoices
cynco invoices list

# Create a customer
cynco customers create --name "Acme Corp" --email acme@example.com

# Generate a financial report
cynco reports generate --type trial_balance --period 2026-03

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

---

## Commands

### `cynco login`

Authenticate by storing your API key locally. The key is validated against the Cynco API before being saved.

```bash
cynco login
```

#### Interactive mode (default in terminals)

When run in a terminal, the command checks for an existing key:

- **No key found** — Offers to open the Cynco API keys dashboard in your browser so you can create one, then prompts for the key.
- **Existing key found** — Shows the key source (`env`, `config`) and prompts for a new key to replace it.

The key is entered via a masked password input and must start with `cak_`.

#### Non-interactive mode (CI, pipes, scripts)

When stdin is not a TTY, the `--key` flag is required:

```bash
cynco login --key cak_xxxxxxxxxxxxx
```

Omitting `--key` in non-interactive mode exits with error code `missing_key`.

#### Options

| Flag | Description |
|------|-------------|
| `--key <key>` | API key to store (required in non-interactive mode) |
| `--profile <name>` | Profile name to store the key under (default: "default") |

#### Output

On success, credentials are saved to `~/.config/cynco/credentials.json` with `0600` permissions (owner read/write only). The config directory is created with `0700` permissions.

```bash
# JSON output
cynco login --key cak_xxx --json
# => {"success":true,"config_path":"/Users/you/.config/cynco/credentials.json"}
```

#### Error codes

| Code | Cause |
|------|-------|
| `missing_key` | No `--key` provided in non-interactive mode |
| `invalid_key_format` | Key does not start with `cak_` |
| `invalid_key` | Cynco API rejected the key |

#### Switch between profiles

If you work across multiple Cynco accounts, the CLI supports multi-profile authentication:

```bash
# Switch active profile
cynco auth switch

# Use a specific profile for one command
cynco invoices list --profile production
```

---

### `cynco invoices list`

List invoices with pagination and filtering.

```bash
cynco invoices list
cynco invoices list --limit 50
```

---

### `cynco customers create`

Create a new customer. Provide fields via flags for scripting, or let the CLI prompt interactively.

```bash
cynco customers create --name "Acme Corp" --email acme@example.com
```

#### Options

| Flag | Required | Description |
|------|----------|-------------|
| `--name <name>` | Yes | Customer name |
| `--email <email>` | No | Contact email |
| `--phone <phone>` | No | Contact phone |
| `--address <address>` | No | Address |
| `--tax-number <number>` | No | Tax registration number |

---

### `cynco reports generate`

Generate financial reports. Supports 7 report types.

```bash
cynco reports generate --type trial_balance --period 2026-03
cynco reports generate --type balance_sheet --start-date 2026-01-01 --end-date 2026-03-31
```

#### Report types

`trial_balance`, `balance_sheet`, `income_statement`, `cash_flow`, `general_ledger`, `aged_receivables`, `aged_payables`

#### Options

| Flag | Description |
|------|-------------|
| `--type <type>` | Report type (required) |
| `--period <YYYY-MM>` | Report period |
| `--start-date <YYYY-MM-DD>` | Start date (for date range) |
| `--end-date <YYYY-MM-DD>` | End date (for date range) |
| `--format <json\|csv>` | Output format |

---

### `cynco doctor`

Run environment diagnostics. Verifies your CLI version, API key, and API connectivity.

```bash
cynco doctor
```

#### Checks performed

| Check | Pass | Warn | Fail |
|-------|------|------|------|
| **CLI Version** | Running latest | Update available | — |
| **API Key** | Key found (shows masked key + source) | — | No key found |
| **API Connectivity** | API reachable | — | Cannot connect |

#### JSON mode

```bash
cynco doctor --json
```

```json
{
  "ok": true,
  "checks": [
    { "name": "CLI Version", "status": "pass", "message": "v0.1.0 (latest)" },
    { "name": "API Key", "status": "pass", "message": "cak_...xxxx (source: env)" },
    { "name": "API Connectivity", "status": "pass", "message": "OK (238ms)" }
  ]
}
```

---

### All commands

| Command | Description |
|---------|-------------|
| `cynco login` | Log in to your Cynco account |
| `cynco logout` | Log out and remove stored credentials |
| `cynco auth list` | List stored profiles |
| `cynco auth switch` | Switch active profile |
| `cynco auth rename` | Rename a profile |
| `cynco auth remove` | Remove a profile |
| `cynco invoices list` | List invoices |
| `cynco invoices get <id>` | Get invoice details |
| `cynco invoices create` | Create an invoice |
| `cynco customers list` | List customers |
| `cynco customers get <id>` | Get customer details |
| `cynco customers create` | Create a customer |
| `cynco customers update <id>` | Update a customer |
| `cynco customers delete <id>` | Delete a customer |
| `cynco vendors list` | List vendors |
| `cynco vendors get <id>` | Get vendor details |
| `cynco vendors create` | Create a vendor |
| `cynco vendors update <id>` | Update a vendor |
| `cynco vendors delete <id>` | Delete a vendor |
| `cynco bills list` | List bills |
| `cynco bills get <id>` | Get bill details |
| `cynco bills create` | Create a bill |
| `cynco items list` | List items |
| `cynco items get <id>` | Get item details |
| `cynco items create` | Create an item |
| `cynco items update <id>` | Update an item |
| `cynco items delete <id>` | Delete an item |
| `cynco accounts list` | List chart of accounts |
| `cynco accounts get <id>` | Get account details |
| `cynco journal-entries list` | List journal entries |
| `cynco journal-entries get <id>` | Get journal entry details |
| `cynco journal-entries create` | Create a journal entry |
| `cynco bank-accounts list` | List bank accounts |
| `cynco bank-accounts get <id>` | Get bank account details |
| `cynco bank-transactions list` | List bank transactions |
| `cynco bank-transactions get <id>` | Get bank transaction details |
| `cynco api-keys list` | List API keys |
| `cynco api-keys create` | Create an API key |
| `cynco api-keys delete <id>` | Delete an API key |
| `cynco webhooks list` | List webhooks |
| `cynco webhooks get <id>` | Get webhook details |
| `cynco webhooks create` | Create a webhook |
| `cynco webhooks update <id>` | Update a webhook |
| `cynco webhooks delete <id>` | Delete a webhook |
| `cynco reports generate` | Generate a financial report |
| `cynco doctor` | Run environment diagnostics |
| `cynco open <page>` | Open Cynco pages in your browser |
| `cynco whoami` | Show current authenticated profile |
| `cynco update` | Check for CLI updates |

---

## Global options

These flags work on every command and are passed before the subcommand:

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
cynco invoices list | jq '.[0].id'
cynco doctor | jq '.checks[].name'
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
  - run: |
      cynco invoices list --json | jq length
```

### AI agents

Agents calling the CLI as a subprocess automatically get JSON output (non-TTY detection). The contract:

- **Input:** All required flags must be provided (no interactive prompts)
- **Output:** JSON to stdout, nothing to stderr
- **Exit code:** `0` success, `1` error
- **Errors:** Always include `message` and `code` fields

---

## Configuration

| Item | Path | Notes |
|------|------|-------|
| Config directory | `~/.config/cynco/` | Respects `$XDG_CONFIG_HOME` on Linux, `%APPDATA%` on Windows |
| Credentials | `~/.config/cynco/credentials.json` | `0600` permissions (owner read/write) |
| Install directory | `~/.cynco/bin/` | Respects `$CYNCO_INSTALL` |

## License

MIT
