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
