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

See detailed steps below.

When setting up preflight for a user, follow these steps:

### 1. Fetch the Repository

```bash
# Clone the repository (use a temp directory or the user's workspace)
git clone https://github.com/enoteware/preflight.git /tmp/preflight-setup
# Or if already cloned in workspace:
cd /path/to/preflight && git pull origin main

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

### 3. Install the VS Code Extension

```bash
# Navigate to extension directory in the cloned repository
# Replace /tmp/preflight-setup with the actual path where you cloned the repo
cd /tmp/preflight-setup/extension

# Install dependencies and build
npm install
npm run compile
npm run package

# Find the generated VSIX file
ls -la *.vsix
# It will be named something like: preflight-status-1.0.0.vsix

# Install the VSIX file (use the exact filename from ls command)
# For VS Code:
code --install-extension preflight-status-1.0.0.vsix

# For Cursor:
cursor --install-extension preflight-status-1.0.0.vsix
```

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
- 📊 **Real-time Dashboard**: HTML dashboard with heartbeat indicators
- 🔄 **Auto-updates**: Always get latest version via npx
- 🎯 **VS Code Extension**: Real-time API health monitoring in your IDE (see [extension/README.md](extension/README.md))

## Commands After Setup

```bash
# Run preflight check
npm run preflight

# Generate status JSON
npm run preflight:status

# Start dashboard server
npm run preflight:dashboard

# Dev server management
npm run dev:start      # Start with auto port detection
npm run dev:restart    # Restart dev server
npm run dev:stop       # Stop dev server
npm run dev:status     # Check status
```

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
