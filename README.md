# Preflight Toolkit

Repo-agnostic preflight checks and dev server management toolkit.

**Repository:** https://github.com/enoteware/preflight

> **🔄 Updating from v1.0?** See [MIGRATION.md](MIGRATION.md) or run `npx tsx src/setup.ts --update` to automatically update your existing installation.

## For AI Agents (Claude/Cursor)

**QUICK START:** When a user requests preflight setup or update, use the single-command installer:

```bash
# Navigate to the user's project directory
cd /path/to/user/project

# Install Preflight (handles everything automatically)
npx @enoteware/preflight@latest install --with-extension
```

This single command will:
- ✅ Detect if Preflight is already installed (and update if needed)
- ✅ Set up all scripts and validators in the project
- ✅ Build and install the VS Code extension
- ✅ Handle backward compatibility (migrates old installations automatically)
- ✅ Preserve custom service checks

**For updates:** The install command automatically detects and updates existing installations. If the user has an old installation, it will:
- Detect the old structure
- Run migration automatically
- Create backup files for safety
- Preserve custom service checks

**When troubleshooting check failures, see [docs/AGENT_INSTRUCTIONS.md](docs/AGENT_INSTRUCTIONS.md) for:**
- How to interpret check results (Configuration vs Service Connections)
- What each error status means and how to fix it
- Step-by-step troubleshooting flows
- Service-specific fix instructions

**Manual setup (if needed):** See detailed steps below for manual installation.

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

## Manual Setup (Alternative Method)

If you need to set up Preflight manually (e.g., for debugging or custom workflows):

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
```

### 2. Set Up Preflight Scripts in User's Project

```bash
# Navigate to the user's project directory (where they want preflight installed)
cd /path/to/user/project

# Run the setup script from the cloned repository
# Replace /tmp/preflight-setup with the actual path where you cloned the repo
npx tsx /tmp/preflight-setup/src/setup.ts

# For existing installations, use --update flag:
# npx tsx /tmp/preflight-setup/src/setup.ts --update
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

### 5. Verify Installation

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

**Easiest way to update:** Just run the install command again - it automatically handles updates!

```bash
# In your project directory
cd /path/to/your/project

# Run install again - it will detect and update existing installation
npx @enoteware/preflight@latest install --with-extension
```

This will:
- ✅ Detect existing installation
- ✅ Update scripts and dashboard to latest version
- ✅ Rebuild and update the extension
- ✅ Preserve your custom service checks
- ✅ Create backups if needed

### Manual Update (Alternative)

If you prefer to update manually:

```bash
# Update scripts and dashboard
cd /path/to/your/project
npx tsx /path/to/preflight/src/setup.ts

# Update extension
cd /path/to/preflight/extension
npm install && npm run compile && npm run package
code --install-extension preflight-status-*.vsix --force
```

**Tip:** Check https://github.com/enoteware/preflight/commits/main regularly for updates.

## Installation

### Quick Install (Recommended)

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install Preflight (handles everything automatically)
npx @enoteware/preflight@latest install --with-extension
```

This single command will:
- Set up all Preflight scripts in your project
- Build and install the VS Code extension
- Handle updates if Preflight is already installed
- Preserve your custom service checks

### Alternative: Manual Installation

```bash
# Install globally
npm install -g @enoteware/preflight

# Or use without installing (recommended)
npx @enoteware/preflight setup
```

## Updating Existing Installations

**The install command automatically handles updates!** Just run:

```bash
npx @enoteware/preflight@latest install --with-extension
```

The installer will:
- ✅ Detect if Preflight is already installed
- ✅ Check if it needs updating (old structure → new structure)
- ✅ Run migration automatically if needed
- ✅ Create backup files for safety
- ✅ Preserve your custom service checks
- ✅ Update the extension to latest version

### Manual Update (if needed)

If you set up Preflight before version 1.1.0, you can manually update:

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

# Or use the new install command (recommended - handles everything)
npx @enoteware/preflight install --with-extension
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
