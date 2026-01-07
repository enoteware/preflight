# Preflight Toolkit

Repo-agnostic preflight checks and dev server management toolkit.

**Repository:** https://github.com/enoteware/preflight

> **🔄 Updating from v1.0?** See [MIGRATION.md](MIGRATION.md) or run `npx tsx src/setup.ts --update` to automatically update your existing installation.

## For AI Agents (Claude/Cursor)

**IMPORTANT:** When a user requests preflight setup, you must:
1. Fetch/clone this repository from GitHub
2. Set up scripts in the user's project
3. Install and activate the VS Code extension
4. Verify everything is working

**When troubleshooting check failures, see [docs/AGENT_INSTRUCTIONS.md](docs/AGENT_INSTRUCTIONS.md) for:**
- How to interpret check results (Configuration vs Service Connections)
- What each error status means and how to fix it
- Step-by-step troubleshooting flows
- Service-specific fix instructions

See detailed steps below.

## ⚠️ ALWAYS Pull Latest Code

**CRITICAL:** This repository is actively developed. Always pull the latest code before setup or updates.

```bash
# If repository is already cloned - PULL LATEST FIRST
cd /path/to/preflight
git fetch origin
git pull origin main  # or: git reset --hard origin/main (for force update)

# Verify you have the latest commit
git log --oneline -1
# Should show the most recent commit

# If cloning fresh
git clone https://github.com/enoteware/preflight.git
cd preflight
```

**Why this matters:**
- ✅ Latest bug fixes and features
- ✅ Updated service logos (15+ included)
- ✅ Latest dashboard improvements
- ✅ Extension updates and fixes
- ✅ New service integrations

When setting up preflight for a user, follow these steps:

### 1. Fetch/Update the Repository

```bash
# OPTION A: Clone fresh (recommended for first time)
git clone https://github.com/enoteware/preflight.git /tmp/preflight-setup
cd /tmp/preflight-setup

# OPTION B: Update existing clone (if you already have it)
cd /path/to/preflight
git fetch origin
git reset --hard origin/main  # Force update to latest
git pull origin main

# VERIFY you have latest
git log --oneline -1
# Compare this SHA with: https://github.com/enoteware/preflight/commits/main

# Note: Remember the path where you cloned it - you'll need it for steps 2 and 3
```

### 2. Set Up Preflight Scripts in User's Project

```bash
# Navigate to the user's project directory (where they want preflight installed)
cd /path/to/user/project

# Run the setup script from the cloned repository
# Replace /tmp/preflight-setup with the actual path where you cloned the repo
npx tsx /tmp/preflight-setup/src/setup.ts

# Alternative: Use the npm package (if published)
# npx @enoteware/preflight setup
```

This will:
- Create `scripts/preflight-check.ts`
- Create `scripts/preflight-validators/` with validators:
  - `cli.ts` - CLI tool checks (Node.js, npm, etc.)
  - `env.ts` - Environment variable validation
  - `services.ts` - **Service connector checks (GitHub API, public APIs, etc.)**
  - `types.ts` - Type definitions
- Add npm scripts to `package.json`
- Set up VS Code configuration

**Note:** Service connectors are automatically set up with basic checks (GitHub API, public API). Users can add more service checks (OpenAI, Resend, Stack Auth, Vercel, Neon, etc.) by editing `scripts/preflight-validators/services.ts`.

### 3. Install/Update the VS Code Extension

**IMPORTANT:** Always rebuild the extension from latest code to get updates.

```bash
# Navigate to extension directory in the cloned repository
# Replace /tmp/preflight-setup with the actual path where you cloned the repo
cd /tmp/preflight-setup/extension

# Install dependencies and build (always do this for latest updates)
npm install
npm run compile
npm run package

# Find the generated VSIX file
ls -la *.vsix
# It will be named something like: preflight-status-1.0.0.vsix

# Install the VSIX file (use the exact filename from ls command)
# This will UPDATE the extension if already installed
# For VS Code:
code --install-extension preflight-status-1.0.0.vsix --force

# For Cursor:
cursor --install-extension preflight-status-1.0.0.vsix --force
```

**Note:** The `--force` flag ensures the extension is updated even if already installed.

### 4. Reload IDE

Tell the user to reload their VS Code/Cursor window:
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Reload Window" and press Enter

### 5. Verify Installation & Latest Version

Check that:
- ✅ `scripts/preflight-check.ts` exists
- ✅ `scripts/preflight-validators/` directory exists with:
  - `cli.ts` - CLI tool validators
  - `env.ts` - Environment variable validators
  - `services.ts` - **Service connector validators (automatically created)**
  - `types.ts` - Type definitions
- ✅ Extension appears in VS Code/Cursor sidebar (Preflight Status icon)
- ✅ Status bar shows preflight status
- ✅ Service connectors are working (check the "Service Connections" view in the extension)

**Verify Latest Version:**
```bash
# Check the dashboard has latest features (service logos, etc.)
cd /path/to/user/project
grep -c "SERVICE_LOGO_MAP" preflight-dashboard.html
# Should return 1 or more (indicates logo support is present)

# Check extension version
cd /tmp/preflight-setup/extension
grep '"version"' package.json
# Verify this matches the latest on GitHub

# Check for latest logos
ls extension/resources/logos/*.svg 2>/dev/null | wc -l
# Should show: 15 (or more as new logos are added)
```

## Keeping Preflight Updated

**After initial setup**, periodically update to get latest features:

### Update Dashboard & Scripts

```bash
# In your project directory where preflight is installed
cd /path/to/your/project

# Pull latest from preflight repo
cd /tmp/preflight-setup  # or wherever you cloned it
git pull origin main

# Re-run setup to update scripts and dashboard
npx tsx /tmp/preflight-setup/src/setup.ts

# This updates:
# - preflight-dashboard.html (gets latest logos, features)
# - scripts/preflight-check.ts (latest check logic)
# - scripts/serve-dashboard.ts (latest server features)
```

### Update Extension

```bash
# Navigate to preflight repo
cd /tmp/preflight-setup
git pull origin main

# Rebuild and reinstall extension
cd extension
npm install
npm run compile
npm run package

# Reinstall (--force updates existing installation)
code --install-extension preflight-status-*.vsix --force
# or for Cursor:
cursor --install-extension preflight-status-*.vsix --force

# Reload IDE window (Cmd+Shift+P → "Reload Window")
```

### Quick Update Check

```bash
# See what's new in the latest version
cd /tmp/preflight-setup
git log --oneline -5  # See last 5 commits
git pull origin main  # Pull latest
```

**Tip:** Check https://github.com/enoteware/preflight/commits/main regularly for updates.

## Installation

```bash
# Install globally
npm install -g @enoteware/preflight

# Or use without installing (recommended)
npx @enoteware/preflight setup
```

## Updating Existing Installations

If you set up Preflight before version 1.1.0, you'll need to update to the new structure that separates **Configuration** checks from **Service Connections**.

### Quick Update

```bash
# Automatic update (recommended)
npx tsx src/setup.ts --update

# Or if using the npm package
npx @enoteware/preflight update
```

This will:
- Update your `preflight-check.ts` to use the new "Configuration" category
- Update your `services.ts` to skip checks when env vars are missing
- Create backups of your existing files (`.backup` extension)
- Preserve your custom env vars and service checks

### Manual Update

See [MIGRATION.md](MIGRATION.md) for detailed migration instructions.

**What changed:**
- ✅ Clear separation: "Missing env var" vs "Service unreachable"
- ✅ Faster feedback: Configuration checks are instant (no network calls)
- ✅ Better error messages: Know exactly what to fix

## Usage

```bash
# Setup preflight checks in current directory
npx @enoteware/preflight setup

# Or from any directory
npx @enoteware/preflight setup /path/to/project

# Update existing installation (v1.1.0+)
npx @enoteware/preflight update
```

## Features

- ✅ **Preflight Checks**: Validate CLI tools, env vars, and service connections
- 🚀 **Dev Server Management**: Auto port detection, start/stop/restart
- 📊 **Real-time Dashboard**: HTML dashboard with heartbeat indicators (auto-refreshes every 10s)
- 🔄 **Auto-updates**: Always get latest version via npx
- 🎯 **VS Code Extension**: Real-time API health monitoring in your IDE (see [extension/README.md](extension/README.md))
- 🔧 **Easy Customization**: Add your own service checks (see [docs/COMMON_SERVICES.md](docs/COMMON_SERVICES.md))
- 🤖 **Agent-Friendly**: Clear instructions for AI agents on troubleshooting (see [docs/AGENT_INSTRUCTIONS.md](docs/AGENT_INSTRUCTIONS.md))

## Commands After Setup

```bash
# Run preflight check
npm run preflight

# Generate status JSON (for dashboard)
npm run preflight:status

# Start dashboard server (auto-refreshes every 10s)
npm run preflight:dashboard
# Then open: http://localhost:8080/preflight-dashboard.html

# Dev server management
npm run dev:start      # Start with auto port detection
npm run dev:restart    # Restart dev server
npm run dev:stop       # Stop dev server
npm run dev:status     # Check status
```

### Dashboard Server

The dashboard requires a server to be running. The `preflight:dashboard` command:
- Starts an HTTP server on port 8080
- **Auto-refreshes** status every 10 seconds (no need to manually run `preflight:status`)
- Serves the dashboard HTML and status JSON

**Note:** The dashboard server must be running for the dashboard to work. It will automatically regenerate `preflight-status.json` periodically.

## VS Code Extension

This repository includes a VS Code/Cursor extension that shows real-time API health and preflight check status directly in your IDE sidebar.

### Quick Install

```bash
cd extension
npm install
npm run compile
npm run package

# Install the VSIX (replace with actual version number)
code --install-extension preflight-status-*.vsix
# or for Cursor:
cursor --install-extension preflight-status-*.vsix

# Then reload the IDE window
```

**Important for AI Agents:** After installing the extension, you must:
1. Reload the VS Code/Cursor window (Cmd+Shift+P → "Reload Window")
2. Verify the extension appears in the sidebar (look for the Preflight Status icon)
3. Check that the status bar shows preflight status on the right side

See [extension/README.md](extension/README.md) for detailed installation and usage instructions.

### Extension Features

- **Sidebar View**: Environment checks and service connections organized by category
- **Auto-refresh**: Updates every 10 seconds (configurable)
- **Status Bar**: Quick summary (e.g., "✅ Preflight: 15/18")
- **Visual Indicators**: Color-coded icons with latency display
- **Help Integration**: Click failed checks to open documentation

## Repository

https://github.com/enoteware/preflight

## License

MIT
