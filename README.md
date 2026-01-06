# Preflight Toolkit

Repo-agnostic preflight checks and dev server management toolkit.

## Installation

```bash
# Install globally
npm install -g @enoteware/preflight

# Or use without installing (recommended)
npx @enoteware/preflight setup
```

## Usage

```bash
# Setup preflight checks in current directory
npx @enoteware/preflight setup

# Or from any directory
npx @enoteware/preflight setup /path/to/project
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

# Install the VSIX
code --install-extension preflight-status-1.0.0.vsix
# or for Cursor:
cursor --install-extension preflight-status-1.0.0.vsix
```

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
