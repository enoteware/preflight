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

## Repository

https://github.com/enoteware/preflight

## License

MIT
