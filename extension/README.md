# Preflight Status Extension

Real-time API health and environment status monitoring for VSCode/Cursor.

## Features

- **Sidebar View**: Shows all preflight checks organized by category
- **Real-time Updates**: Auto-refreshes every 10 seconds (configurable)
- **Status Bar**: Quick summary of passing/failing checks
- **Visual Indicators**: Color-coded icons (green/yellow/red) with latency display
- **Quick Actions**: Refresh, run checks, open dashboard
- **Help Links**: Click to open documentation for failed checks

## Views

### Environment Checks
- CLI Tools (node, npm, vercel, psql)
- Environment Variables
- Configuration validation

### Service Connections
- Database (Neon)
- APIs (Vercel, Stack Auth, OpenAI, Resend)
- Dev Server status

## Commands

- **Preflight: Refresh Checks** - Manually refresh all checks
- **Preflight: Run Check** - Run checks with progress indicator
- **Preflight: Open Dashboard** - Open HTML dashboard in browser

## Settings

- `preflight.autoRefresh` - Enable auto-refresh (default: true)
- `preflight.refreshInterval` - Refresh interval in seconds (default: 10, min: 5)
- `preflight.showInStatusBar` - Show status in status bar (default: true)
- `preflight.quickMode` - Use quick mode, skip slow checks (default: true)

## Installation

### For Development (Local Extension)

1. Navigate to the extension directory:
   ```bash
   cd extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile:
   ```bash
   npm run compile
   ```

4. Package the extension:
   ```bash
   npm run package
   ```

5. Install the VSIX file:
   ```bash
   # For VSCode
   code --install-extension preflight-status-1.0.0.vsix
   
   # For Cursor
   cursor --install-extension preflight-status-1.0.0.vsix
   ```

6. Reload VSCode/Cursor window:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: "Reload Window"
   - Press Enter

### Quick Install Script

```bash
cd extension && npm install && npm run compile && npm run package
```

Then install the generated `.vsix` file.

## Requirements

- Node.js 18+
- Preflight check scripts in `scripts/` directory (from parent repo setup)
- `scripts/preflight-check.ts` with `--json` flag support

## Usage

1. Open a workspace with preflight checks set up
2. The extension activates automatically
3. Click the **Preflight Status** icon in the activity bar (left sidebar)
4. View real-time status of all checks
5. Click on items to open help documentation

## Status Indicators

- ✅ **Green (Pass)**: Check passed
- ⚠️ **Yellow (Warning)**: Non-critical issue
- ❌ **Red (Error)**: Critical issue requiring attention

## Architecture

```
extension/
├── src/
│   ├── extension.ts         # Main extension entry point
│   ├── treeDataProvider.ts  # Tree view provider
│   ├── statusBar.ts         # Status bar integration
│   ├── checkRunner.ts       # Executes preflight checks
│   └── types.ts             # Shared types
├── resources/
│   └── icon.svg             # Extension icon
├── package.json             # Extension manifest
├── tsconfig.json            # TypeScript config
└── README.md                # Documentation
```

## Development

```bash
# Compile
npm run compile

# Watch mode (auto-recompile)
npm run watch

# Package
npm run package
```

### Debugging

1. Open the extension folder in VSCode/Cursor
2. Press F5 to launch Extension Development Host
3. The extension will load in a new window
4. Set breakpoints in `src/*.ts` files

## Publishing

To publish to VSCode marketplace:

1. Create publisher account at https://marketplace.visualstudio.com/manage
2. Get Personal Access Token (PAT)
3. Login: `npx vsce login enoteware`
4. Publish: `npm run publish`

## Troubleshooting

### Extension Not Loading

1. Check the extension is compiled:
   ```bash
   ls dist/extension.js
   ```

2. Rebuild if needed:
   ```bash
   npm run compile
   ```

3. Check for errors in Output panel:
   - View → Output
   - Select "Extension Host" from dropdown

### No Checks Showing

1. Verify preflight scripts exist:
   ```bash
   ls scripts/preflight-check.ts
   ```

2. Test preflight manually:
   ```bash
   npx tsx scripts/preflight-check.ts --json
   ```

3. Check extension logs in Output panel

### Status Bar Not Showing

1. Check settings: `preflight.showInStatusBar` should be `true`
2. Look for the status on the right side of the status bar
3. Click it to run checks

## License

MIT
