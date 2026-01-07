# VS Code extension for API health
_Exported on 1/6/2026 at 13:59:51 PST from Cursor (2.3.23)_

---

**User**

check @/Users/elliotnoteware/Downloads/cursor_repo_pre_flight_checks.md i want to make my connections a vs code extension so we can easily see in the ide our api health

---

**Cursor**

I'll help you create a VSCode extension that shows API health status directly in the IDE. Let me explore the current setup and create the extension structure.

Now I'll create a VSCode extension that shows your API health status directly in the IDE with real-time updates.

```json
{
  "name": "preflight-status",
  "displayName": "Preflight Status",
  "description": "Real-time API health and environment status monitoring",
  "version": "1.0.0",
  "publisher": "enoteware",
  "repository": {
    "type": "git",
    "url": "https://github.com/enoteware/preflight.git"
  },
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "preflight-status",
          "title": "Preflight Status",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "preflight-status": [
        {
          "id": "preflightChecks",
          "name": "Environment Checks"
        },
        {
          "id": "preflightServices",
          "name": "Service Connections"
        }
      ]
    },
    "commands": [
      {
        "command": "preflight.refresh",
        "title": "Refresh Checks",
        "icon": "$(refresh)"
      },
      {
        "command": "preflight.runCheck",
        "title": "Run Preflight Check",
        "icon": "$(run)"
      },
      {
        "command": "preflight.openDashboard",
        "title": "Open Dashboard",
        "icon": "$(dashboard)"
      },
      {
        "command": "preflight.copyHelpUrl",
        "title": "Copy Help URL",
        "icon": "$(link)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "preflight.refresh",
          "when": "view == preflightChecks || view == preflightServices",
          "group": "navigation"
        },
        {
          "command": "preflight.runCheck",
          "when": "view == preflightChecks || view == preflightServices",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "preflight.copyHelpUrl",
          "when": "viewItem == check-with-help",
          "group": "inline"
        }
      ]
    },
    "configuration": {
      "title": "Preflight Status",
      "properties": {
        "preflight.autoRefresh": {
          "type": "boolean",
          "default": true,
          "description": "Automatically refresh checks periodically"
        },
        "preflight.refreshInterval": {
          "type": "number",
          "default": 10,
          "description": "Refresh interval in seconds (min: 5)"
        },
        "preflight.showInStatusBar": {
          "type": "boolean",
          "default": true,
          "description": "Show status in the status bar"
        },
        "preflight.quickMode": {
          "type": "boolean",
          "default": true,
          "description": "Use quick mode (skip slow checks)"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "publish": "vsce publish"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.80.0",
    "@vscode/vsce": "^2.22.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "dotenv": "^16.3.1"
  }
}

```

```typescript
/**
 * Preflight Status VSCode Extension
 * Shows real-time API health and environment status
 */

import * as vscode from 'vscode';
import { PreflightTreeDataProvider, CheckTreeItem } from './treeDataProvider';
import { PreflightStatusBar } from './statusBar';
import { runPreflightChecks } from './checkRunner';

let statusBar: PreflightStatusBar;
let checksProvider: PreflightTreeDataProvider;
let servicesProvider: PreflightTreeDataProvider;
let refreshTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Preflight Status extension activated');

  // Initialize status bar
  statusBar = new PreflightStatusBar();
  context.subscriptions.push(statusBar);

  // Initialize tree data providers
  checksProvider = new PreflightTreeDataProvider('checks');
  servicesProvider = new PreflightTreeDataProvider('services');

  // Register tree data providers
  vscode.window.registerTreeDataProvider('preflightChecks', checksProvider);
  vscode.window.registerTreeDataProvider('preflightServices', servicesProvider);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('preflight.refresh', async () => {
      await refreshChecks();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('preflight.runCheck', async () => {
      await runCheckWithProgress();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('preflight.openDashboard', () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const dashboardPath = vscode.Uri.joinPath(
          workspaceFolder.uri,
          'preflight-dashboard.html'
        );
        vscode.env.openExternal(vscode.Uri.parse(`file://${dashboardPath.fsPath}`));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('preflight.copyHelpUrl', (item: CheckTreeItem) => {
      if (item.helpUrl) {
        vscode.env.clipboard.writeText(item.helpUrl);
        vscode.window.showInformationMessage(`Copied: ${item.helpUrl}`);
      }
    })
  );

  // Initial check
  refreshChecks();

  // Set up auto-refresh
  const config = vscode.workspace.getConfiguration('preflight');
  const autoRefresh = config.get<boolean>('autoRefresh', true);
  const refreshInterval = Math.max(config.get<number>('refreshInterval', 10), 5);

  if (autoRefresh) {
    startAutoRefresh(refreshInterval);
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('preflight')) {
        const newConfig = vscode.workspace.getConfiguration('preflight');
        const newAutoRefresh = newConfig.get<boolean>('autoRefresh', true);
        const newInterval = Math.max(newConfig.get<number>('refreshInterval', 10), 5);

        if (refreshTimer) {
          clearInterval(refreshTimer);
        }

        if (newAutoRefresh) {
          startAutoRefresh(newInterval);
        }
      }
    })
  );
}

function startAutoRefresh(intervalSeconds: number) {
  refreshTimer = setInterval(() => {
    refreshChecks();
  }, intervalSeconds * 1000);
}

async function refreshChecks() {
  try {
    const results = await runPreflightChecks();

    // Update tree views
    checksProvider.updateChecks(results.checks);
    servicesProvider.updateChecks(results.services);

    // Update status bar
    statusBar.updateStatus(results.summary);
  } catch (error) {
    console.error('Error refreshing checks:', error);
    vscode.window.showErrorMessage(`Preflight check failed: ${error}`);
  }
}

async function runCheckWithProgress() {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Running preflight checks...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0 });
      await refreshChecks();
      progress.report({ increment: 100 });
      vscode.window.showInformationMessage('Preflight checks complete');
    }
  );
}

export function deactivate() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
}

```

```typescript
/**
 * Tree Data Provider for Preflight Checks
 */

import * as vscode from 'vscode';

export interface CheckData {
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
  latency?: number;
  helpUrl?: string;
  timestamp?: number;
}

export class CheckTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly status: 'ok' | 'warning' | 'error',
    public readonly details?: string,
    public readonly helpUrl?: string,
    public readonly latency?: number
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    // Set icon based on status
    this.iconPath = new vscode.ThemeIcon(
      status === 'ok' ? 'pass-filled' : status === 'warning' ? 'warning' : 'error',
      status === 'ok'
        ? new vscode.ThemeColor('testing.iconPassed')
        : status === 'warning'
          ? new vscode.ThemeColor('editorWarning.foreground')
          : new vscode.ThemeColor('testing.iconFailed')
    );

    // Set tooltip
    this.tooltip = details || label;

    // Add latency to description
    if (latency) {
      this.description = `${latency}ms`;
    }

    // Set context value for menu items
    this.contextValue = helpUrl ? 'check-with-help' : 'check';

    // Make it clickable if there's a help URL
    if (helpUrl) {
      this.command = {
        command: 'vscode.open',
        title: 'Open Help',
        arguments: [vscode.Uri.parse(helpUrl)],
      };
    }
  }
}

export class PreflightTreeDataProvider
  implements vscode.TreeDataProvider<CheckTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CheckTreeItem | undefined | null | void
  > = new vscode.EventEmitter<CheckTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CheckTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private checks: CheckData[] = [];

  constructor(private category: 'checks' | 'services') {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateChecks(checks: CheckData[]): void {
    this.checks = checks;
    this.refresh();
  }

  getTreeItem(element: CheckTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CheckTreeItem): Thenable<CheckTreeItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    if (this.checks.length === 0) {
      return Promise.resolve([]);
    }

    const items = this.checks.map(
      (check) =>
        new CheckTreeItem(
          check.message,
          check.status,
          check.details,
          check.helpUrl,
          check.latency
        )
    );

    return Promise.resolve(items);
  }
}

```

```typescript
/**
 * Status Bar Integration
 */

import * as vscode from 'vscode';

export interface StatusSummary {
  total: number;
  ok: number;
  warnings: number;
  errors: number;
}

export class PreflightStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = 'preflight.runCheck';
    this.statusBarItem.show();
    this.updateStatus({ total: 0, ok: 0, warnings: 0, errors: 0 });
  }

  updateStatus(summary: StatusSummary): void {
    const config = vscode.workspace.getConfiguration('preflight');
    const showInStatusBar = config.get<boolean>('showInStatusBar', true);

    if (!showInStatusBar) {
      this.statusBarItem.hide();
      return;
    }

    // Determine icon and color
    let icon = '$(check)';
    let color: string | undefined;

    if (summary.errors > 0) {
      icon = '$(error)';
      color = new vscode.ThemeColor('statusBarItem.errorBackground').toString();
    } else if (summary.warnings > 0) {
      icon = '$(warning)';
      color = new vscode.ThemeColor('statusBarItem.warningBackground').toString();
    } else if (summary.ok > 0) {
      icon = '$(check)';
      color = undefined; // Default color
    }

    // Build text
    const text = `${icon} Preflight: ${summary.ok}/${summary.total}`;

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = this.buildTooltip(summary);
    this.statusBarItem.backgroundColor = color as any;

    this.statusBarItem.show();
  }

  private buildTooltip(summary: StatusSummary): string {
    const parts = [
      `Preflight Status`,
      ``,
      `Total: ${summary.total}`,
      `✅ Passing: ${summary.ok}`,
    ];

    if (summary.warnings > 0) {
      parts.push(`⚠️ Warnings: ${summary.warnings}`);
    }

    if (summary.errors > 0) {
      parts.push(`❌ Errors: ${summary.errors}`);
    }

    parts.push(``, `Click to run checks`);

    return parts.join('\n');
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

```

```typescript
/**
 * Check Runner - Executes preflight checks
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { CheckData, StatusSummary } from './types';

const execAsync = promisify(exec);

export interface PreflightResults {
  checks: CheckData[];
  services: CheckData[];
  summary: StatusSummary;
}

export async function runPreflightChecks(): Promise<PreflightResults> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    throw new Error('No workspace folder open');
  }

  const config = vscode.workspace.getConfiguration('preflight');
  const quickMode = config.get<boolean>('quickMode', true);

  // Run preflight check script with JSON output
  const scriptPath = join(workspaceFolder.uri.fsPath, 'scripts', 'preflight-check.ts');
  const command = `npx tsx "${scriptPath}" --json ${quickMode ? '--quick' : ''}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceFolder.uri.fsPath,
      timeout: 30000, // 30 second timeout
    });

    if (stderr) {
      console.warn('Preflight check stderr:', stderr);
    }

    // Parse JSON output
    const data = JSON.parse(stdout);

    // Categorize results
    const checks: CheckData[] = [];
    const services: CheckData[] = [];

    let total = 0;
    let ok = 0;
    let warnings = 0;
    let errors = 0;

    for (const summary of data.summaries || []) {
      const isService = summary.category.toLowerCase().includes('service') ||
        summary.category.toLowerCase().includes('connection');

      for (const result of summary.results || []) {
        const checkData: CheckData = {
          status: result.status,
          message: result.message,
          details: result.details,
          latency: result.latency,
          helpUrl: result.helpUrl,
          timestamp: Date.now(),
        };

        if (isService) {
          services.push(checkData);
        } else {
          checks.push(checkData);
        }

        total++;
        if (result.status === 'ok') ok++;
        else if (result.status === 'warning') warnings++;
        else if (result.status === 'error') errors++;
      }
    }

    return {
      checks,
      services,
      summary: { total, ok, warnings, errors },
    };
  } catch (error) {
    console.error('Error running preflight checks:', error);

    // Return empty results with error
    return {
      checks: [
        {
          status: 'error',
          message: 'Failed to run preflight checks',
          details: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        },
      ],
      services: [],
      summary: { total: 1, ok: 0, warnings: 0, errors: 1 },
    };
  }
}

```

```typescript
/**
 * Shared types for Preflight Status Extension
 */

export interface CheckData {
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
  latency?: number;
  helpUrl?: string;
  timestamp?: number;
}

export interface StatusSummary {
  total: number;
  ok: number;
  warnings: number;
  errors: number;
}

```

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "dist",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

```

```xml
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
  <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
</svg>

```

```markdown
# Preflight Status Extension

Real-time API health and environment status monitoring for VSCode/Cursor.

## Features

- **Sidebar View**: Shows all preflight checks organized by category
- **Real-time Updates**: Auto-refreshes every 10 seconds (configurable)
- **Status Bar**: Quick summary of passing/failing checks
- **Heartbeat Indicators**: Visual indicators for check status (green/yellow/red)
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

1. Copy this extension to your workspace:
   ```
   .vscode/extensions/preflight-status/
   ```

2. Install dependencies:
   ```bash
   cd .vscode/extensions/preflight-status
   npm install
   ```

3. Compile:
   ```bash
   npm run compile
   ```

4. Reload VSCode/Cursor window

### For Distribution (VSIX)

1. Package the extension:
   ```bash
   npm run package
   ```

2. Install the `.vsix` file in VSCode/Cursor

3. Or publish to marketplace:
   ```bash
   npm run publish
   ```

## Requirements

- Node.js 18+
- Preflight check scripts in `scripts/` directory
- `scripts/preflight-check.ts` with `--json` flag support

## Usage

1. Open a workspace with preflight checks set up
2. The extension activates automatically
3. Click the Preflight Status icon in the activity bar
4. View real-time status of all checks
5. Click on items to open help documentation

## Status Indicators

- ✅ **Green (Pass)**: Check passed
- ⚠️ **Yellow (Warning)**: Non-critical issue
- ❌ **Red (Error)**: Critical issue requiring attention

## Architecture

```
preflight-status/
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

## Publishing

To publish to VSCode marketplace:

1. Create publisher account at https://marketplace.visualstudio.com/manage
2. Get Personal Access Token (PAT)
3. Login: `npx vsce login <publisher>`
4. Publish: `npm run publish`

## License

MIT

```

```ignore
.vscode/**
.vscode-test/**
src/**
.gitignore
tsconfig.json
**/*.map
**/*.ts
!dist/**/*.js
node_modules/**

```

```ignore
node_modules/
dist/
*.vsix
*.log
.DS_Store

```

Now creating the installation guide and setup scripts:

```markdown
# Preflight Status Extension - Setup Guide

This extension shows real-time API health and environment status directly in VSCode/Cursor.

## Quick Start

### 1. Install Dependencies

```bash
cd .vscode/extensions/preflight-status
npm install
```

### 2. Compile Extension

```bash
npm run compile
```

### 3. Test in VSCode/Cursor

#### Option A: Press F5 (Recommended)
- Open this folder in VSCode/Cursor
- Press F5 to launch Extension Development Host
- The extension will load in a new window

#### Option B: Install Locally
```bash
npm run package
code --install-extension preflight-status-1.0.0.vsix
```

### 4. Reload Window

After installation, reload the window:
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type: "Reload Window"
- Press Enter

## Viewing the Extension

1. Look for the **Preflight Status** icon in the Activity Bar (left sidebar)
2. Click it to open the status view
3. You'll see two sections:
   - **Environment Checks**: CLI tools, env vars
   - **Service Connections**: Database, APIs, dev server

## Status Indicators

- 🟢 **Green (✅)**: Check passed
- 🟡 **Yellow (⚠️)**: Warning, non-critical
- 🔴 **Red (❌)**: Error, requires attention

## Commands

Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Preflight: Refresh Checks** - Manually refresh
- **Preflight: Run Check** - Run with progress indicator
- **Preflight: Open Dashboard** - Open HTML dashboard

## Settings

Open Settings (`Cmd+,` / `Ctrl+,`) and search for "Preflight":

- **Auto Refresh**: Enable/disable automatic updates
- **Refresh Interval**: How often to check (seconds)
- **Show in Status Bar**: Display summary in status bar
- **Quick Mode**: Skip slow checks (faster)

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
   npm run preflight:quick
   ```

3. Check extension logs in Output panel

### Status Bar Not Showing

1. Check settings: `preflight.showInStatusBar` should be `true`
2. Look for the status on the right side of the status bar
3. Click it to run checks

## Development

### Watch Mode

For development with auto-recompile:

```bash
npm run watch
```

Then press F5 to launch Extension Development Host.

### Debugging

1. Set breakpoints in `src/*.ts` files
2. Press F5 to launch Extension Development Host
3. Breakpoints will hit in the original TypeScript

## Publishing

### To VSCode Marketplace

1. Create publisher account: https://marketplace.visualstudio.com/manage
2. Get Personal Access Token
3. Login:
   ```bash
   npx vsce login enoteware
   ```
4. Publish:
   ```bash
   npm run publish
   ```

### As VSIX (Local Install)

```bash
npm run package
# Installs: preflight-status-1.0.0.vsix
```

Share the `.vsix` file with others who can install via:
```bash
code --install-extension preflight-status-1.0.0.vsix
```

## Architecture

```
preflight-status/
├── src/
│   ├── extension.ts         # Main entry point, activates extension
│   ├── treeDataProvider.ts  # Manages tree views for checks
│   ├── statusBar.ts         # Status bar integration
│   ├── checkRunner.ts       # Runs preflight scripts and parses results
│   └── types.ts             # Shared TypeScript types
├── resources/
│   └── icon.svg             # Extension icon for activity bar
├── package.json             # Extension manifest and configuration
├── tsconfig.json            # TypeScript compiler config
└── README.md                # User-facing documentation
```

## How It Works

1. **Extension Activates**: On workspace open (via `onStartupFinished`)
2. **Runs Initial Check**: Executes `scripts/preflight-check.ts --json`
3. **Parses Results**: Categorizes into Environment Checks and Service Connections
4. **Updates Views**: Populates tree views and status bar
5. **Auto-Refresh**: Repeats check every N seconds (configurable)

## Integration with Existing Scripts

The extension uses your existing preflight check scripts:
- `scripts/preflight-check.ts` - Main check script
- `scripts/preflight-validators/` - All validators

No duplication - the extension just runs your scripts and displays results in the IDE.

## Next Steps

1. Test the extension (F5)
2. Adjust settings to your preference
3. Customize validators in `scripts/preflight-validators/`
4. Package and share `.vsix` with team
5. Optional: Publish to marketplace

```

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}

```

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "compile",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$tsc"],
      "label": "npm: compile",
      "detail": "tsc -p ./"
    },
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": ["$tsc-watch"],
      "isBackground": true,
      "label": "npm: watch",
      "detail": "tsc -watch -p ./"
    }
  ]
}

```

```markdown
# /setup-preflight

Sets up preflight checks by automatically fetching the latest scripts from GitHub.

## Usage

```bash
/setup-preflight
```

That's it! The command will:
1. Fetch all scripts from `https://github.com/enoteware/preflight`
2. Download validators, templates, and dashboard
3. Create preflight structure in your repo
4. Add npm scripts to `package.json`
5. Configure VSCode integration
6. **Install Preflight Status Extension** (shows API health in IDE)

## What Gets Installed

- ✅ Preflight check scripts (`scripts/preflight-check.ts`)
- ✅ Validators for CLI tools, env vars, services
- ✅ Dev server manager with auto port detection
- ✅ Real-time HTML dashboard
- ✅ **VSCode Extension** - Shows status in sidebar
- ✅ VSCode auto-run on workspace open

## VSCode Extension Features

After setup, you'll have a new sidebar view showing:
- **Environment Checks**: CLI tools, env vars
- **Service Connections**: Database, APIs, dev server
- **Status Bar**: Quick summary (e.g., "✅ Preflight: 15/18")
- **Auto-Refresh**: Updates every 10 seconds
- **Heartbeat Indicators**: Visual status with colors

## After Setup

```bash
# Install dependencies
npm install

# Compile extension
cd .vscode/extensions/preflight-status && npm install && npm run compile

# Run preflight check
npm run preflight

# Generate status for dashboard
npm run preflight:status

# Start dashboard server
npm run preflight:dashboard

# Dev server management
npm run dev:start      # Start with auto port detection
npm run dev:restart    # Restart
npm run dev:stop       # Stop
```

## Viewing Status in IDE

1. Click the **Preflight Status** icon in the Activity Bar (left sidebar)
2. See all checks organized by category
3. Status updates automatically every 10 seconds
4. Click items to open help documentation

## Dashboard

Open the HTML dashboard:
- Open `preflight-dashboard.html` in browser
- Or run: `npm run preflight:dashboard` (starts server on port 8080)

## Auto-Updates

Always fetches the latest version from GitHub - no manual updates needed!

## Manual Installation

If `/setup-preflight` doesn't work, use:

```bash
# Option 1: Direct GitHub fetch
curl -fsSL https://raw.githubusercontent.com/enoteware/preflight/main/install.sh | bash

# Option 2: Use setup script
npx tsx scripts/setup-preflight-github.ts
```

```

Now let me fix the imports and install the extension:

```typescript
/**
 * Check Runner - Executes preflight checks
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import type { CheckData, StatusSummary } from './types';

const execAsync = promisify(exec);

export interface PreflightResults {
  checks: CheckData[];
  services: CheckData[];
  summary: StatusSummary;
}

export async function runPreflightChecks(): Promise<PreflightResults> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    throw new Error('No workspace folder open');
  }

  const config = vscode.workspace.getConfiguration('preflight');
  const quickMode = config.get<boolean>('quickMode', true);

  // Run preflight check script with JSON output
  const scriptPath = join(workspaceFolder.uri.fsPath, 'scripts', 'preflight-check.ts');
  const command = `npx tsx "${scriptPath}" --json ${quickMode ? '--quick' : ''}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceFolder.uri.fsPath,
      timeout: 30000, // 30 second timeout
    });

    if (stderr) {
      console.warn('Preflight check stderr:', stderr);
    }

    // Parse JSON output
    const data = JSON.parse(stdout);

    // Categorize results
    const checks: CheckData[] = [];
    const services: CheckData[] = [];

    let total = 0;
    let ok = 0;
    let warnings = 0;
    let errors = 0;

    for (const summary of data.summaries || []) {
      const isService = summary.category.toLowerCase().includes('service') ||
        summary.category.toLowerCase().includes('connection');

      for (const result of summary.results || []) {
        const checkData: CheckData = {
          status: result.status,
          message: result.message,
          details: result.details,
          latency: result.latency,
          helpUrl: result.helpUrl,
          timestamp: Date.now(),
        };

        if (isService) {
          services.push(checkData);
        } else {
          checks.push(checkData);
        }

        total++;
        if (result.status === 'ok') ok++;
        else if (result.status === 'warning') warnings++;
        else if (result.status === 'error') errors++;
      }
    }

    return {
      checks,
      services,
      summary: { total, ok, warnings, errors },
    };
  } catch (error) {
    console.error('Error running preflight checks:', error);

    // Return empty results with error
    return {
      checks: [
        {
          status: 'error',
          message: 'Failed to run preflight checks',
          details: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        },
      ],
      services: [],
      summary: { total: 1, ok: 0, warnings: 0, errors: 1 },
    };
  }
}

```

```typescript
/**
 * Status Bar Integration
 */

import * as vscode from 'vscode';
import type { StatusSummary } from './types';

export class PreflightStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = 'preflight.runCheck';
    this.statusBarItem.show();
    this.updateStatus({ total: 0, ok: 0, warnings: 0, errors: 0 });
  }

  updateStatus(summary: StatusSummary): void {
    const config = vscode.workspace.getConfiguration('preflight');
    const showInStatusBar = config.get<boolean>('showInStatusBar', true);

    if (!showInStatusBar) {
      this.statusBarItem.hide();
      return;
    }

    // Determine icon and color
    let icon = '$(check)';
    let color: string | undefined;

    if (summary.errors > 0) {
      icon = '$(error)';
      color = new vscode.ThemeColor('statusBarItem.errorBackground').toString();
    } else if (summary.warnings > 0) {
      icon = '$(warning)';
      color = new vscode.ThemeColor('statusBarItem.warningBackground').toString();
    } else if (summary.ok > 0) {
      icon = '$(check)';
      color = undefined; // Default color
    }

    // Build text
    const text = `${icon} Preflight: ${summary.ok}/${summary.total}`;

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = this.buildTooltip(summary);
    this.statusBarItem.backgroundColor = color as any;

    this.statusBarItem.show();
  }

  private buildTooltip(summary: StatusSummary): string {
    const parts = [
      `Preflight Status`,
      ``,
      `Total: ${summary.total}`,
      `✅ Passing: ${summary.ok}`,
    ];

    if (summary.warnings > 0) {
      parts.push(`⚠️ Warnings: ${summary.warnings}`);
    }

    if (summary.errors > 0) {
      parts.push(`❌ Errors: ${summary.errors}`);
    }

    parts.push(``, `Click to run checks`);

    return parts.join('\n');
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

```

```typescript
/**
 * Tree Data Provider for Preflight Checks
 */

import * as vscode from 'vscode';
import type { CheckData } from './types';

export class CheckTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly status: 'ok' | 'warning' | 'error',
    public readonly details?: string,
    public readonly helpUrl?: string,
    public readonly latency?: number
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    // Set icon based on status
    this.iconPath = new vscode.ThemeIcon(
      status === 'ok' ? 'pass-filled' : status === 'warning' ? 'warning' : 'error',
      status === 'ok'
        ? new vscode.ThemeColor('testing.iconPassed')
        : status === 'warning'
          ? new vscode.ThemeColor('editorWarning.foreground')
          : new vscode.ThemeColor('testing.iconFailed')
    );

    // Set tooltip
    this.tooltip = details || label;

    // Add latency to description
    if (latency) {
      this.description = `${latency}ms`;
    }

    // Set context value for menu items
    this.contextValue = helpUrl ? 'check-with-help' : 'check';

    // Make it clickable if there's a help URL
    if (helpUrl) {
      this.command = {
        command: 'vscode.open',
        title: 'Open Help',
        arguments: [vscode.Uri.parse(helpUrl)],
      };
    }
  }
}

export class PreflightTreeDataProvider
  implements vscode.TreeDataProvider<CheckTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CheckTreeItem | undefined | null | void
  > = new vscode.EventEmitter<CheckTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CheckTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private checks: CheckData[] = [];

  constructor(private category: 'checks' | 'services') {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateChecks(checks: CheckData[]): void {
    this.checks = checks;
    this.refresh();
  }

  getTreeItem(element: CheckTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CheckTreeItem): Thenable<CheckTreeItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    if (this.checks.length === 0) {
      return Promise.resolve([]);
    }

    const items = this.checks.map(
      (check) =>
        new CheckTreeItem(
          check.message,
          check.status,
          check.details,
          check.helpUrl,
          check.latency
        )
    );

    return Promise.resolve(items);
  }
}

```

