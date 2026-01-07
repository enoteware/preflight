/**
 * Preflight Status VSCode Extension
 * Shows real-time API health and environment status
 */

import * as vscode from 'vscode';
import { PreflightTreeDataProvider, CheckTreeItem } from './treeDataProvider';
import { PreflightStatusBar } from './statusBar';
import { runPreflightChecks } from './checkRunner';
import { DashboardProvider } from './dashboardProvider';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

let statusBar: PreflightStatusBar;
let checksProvider: PreflightTreeDataProvider;
let servicesProvider: PreflightTreeDataProvider;
let refreshTimer: NodeJS.Timeout | undefined;
let refreshInProgress = false;
let dashboardServerProcess: ChildProcess | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Preflight Status extension activated');
  
  // Show activation message
  vscode.window.showInformationMessage('Preflight Status extension activated!');

  // Initialize status bar
  statusBar = new PreflightStatusBar();
  context.subscriptions.push(statusBar);

  // Initialize tree data providers
  checksProvider = new PreflightTreeDataProvider('checks');
  servicesProvider = new PreflightTreeDataProvider('services');

  console.log('Registering tree data providers...');
  
  // Register tree data providers (must be added to subscriptions)
  const checksDisposable = vscode.window.registerTreeDataProvider('preflightChecks', checksProvider);
  const servicesDisposable = vscode.window.registerTreeDataProvider('preflightServices', servicesProvider);
  
  context.subscriptions.push(checksDisposable);
  context.subscriptions.push(servicesDisposable);
  
  console.log('Tree data providers registered successfully');

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
      DashboardProvider.createOrShow(context);
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

  context.subscriptions.push(
    vscode.commands.registerCommand('preflight.openEnvFile', async (filePath?: string, lineNumber?: number) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder || !filePath) {
        vscode.window.showWarningMessage('Cannot open environment file: workspace or file path not found');
        return;
      }

      try {
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        // Jump to the line if provided
        if (lineNumber && lineNumber > 0) {
          const position = new vscode.Position(lineNumber - 1, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
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

  // Start dashboard server if enabled
  const autoStartDashboard = config.get<boolean>('autoStartDashboard', true);
  if (autoStartDashboard) {
    startDashboardServer(context);
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('preflight')) {
        const newConfig = vscode.workspace.getConfiguration('preflight');
        const newAutoRefresh = newConfig.get<boolean>('autoRefresh', true);
        const newInterval = Math.max(newConfig.get<number>('refreshInterval', 10), 5);
        const newAutoStartDashboard = newConfig.get<boolean>('autoStartDashboard', true);

        if (refreshTimer) {
          clearInterval(refreshTimer);
        }

        if (newAutoRefresh) {
          startAutoRefresh(newInterval);
        }

        // Handle dashboard server auto-start changes
        if (newAutoStartDashboard && !dashboardServerProcess) {
          startDashboardServer(context);
        } else if (!newAutoStartDashboard && dashboardServerProcess) {
          stopDashboardServer();
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
  // Prevent overlapping refresh calls
  if (refreshInProgress) {
    console.log('Refresh already in progress, skipping...');
    return;
  }
  
  refreshInProgress = true;
  console.log('Starting preflight checks refresh...');
  
  try {
    const results = await runPreflightChecks();
    console.log('Preflight checks completed:', {
      checks: results.checks.length,
      services: results.services.length,
      summary: results.summary
    });

    // Check for errors in the results (runPreflightChecks returns error results, doesn't throw)
    if (results.summary.errors > 0) {
      const errorMessages = [
        ...results.checks.filter(c => c.status === 'error'),
        ...results.services.filter(s => s.status === 'error'),
      ].map(e => e.message).join(', ');
      
      if (errorMessages) {
        vscode.window.showWarningMessage(`Preflight checks found errors: ${errorMessages}`);
      }
    }

    // Update tree views
    console.log('Updating tree views...');
    checksProvider.updateChecks(results.checks);
    servicesProvider.updateChecks(results.services);
    console.log('Tree views updated');

    // Update status bar
    statusBar.updateStatus(results.summary);
  } catch (error) {
    // This catch only handles actual exceptions (e.g., if runPreflightChecks itself fails)
    console.error('Error refreshing checks:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Preflight check failed: ${errorMessage}`);
    
    // Show error in tree view
    checksProvider.updateChecks([{
      status: 'error',
      message: 'Failed to run checks',
      details: errorMessage,
      timestamp: Date.now()
    }]);
  } finally {
    refreshInProgress = false;
    console.log('Refresh complete');
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

function startDashboardServer(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  // Check if server script exists
  const serverScriptPath = join(workspaceFolder.uri.fsPath, 'scripts', 'serve-dashboard.ts');
  if (!existsSync(serverScriptPath)) {
    console.log('Dashboard server script not found, skipping auto-start');
    return;
  }

  // Check if server is already running
  if (dashboardServerProcess && !dashboardServerProcess.killed) {
    console.log('Dashboard server already running');
    return;
  }

  // Check if port is already in use (simple check)
  const port = process.env.PORT || '8080';
  
  try {
    console.log('Starting dashboard server...');
    dashboardServerProcess = spawn('npx', ['tsx', serverScriptPath], {
      cwd: workspaceFolder.uri.fsPath,
      stdio: 'pipe',
      shell: true,
    });

    dashboardServerProcess.stdout?.on('data', (data) => {
      console.log(`[Dashboard Server] ${data.toString().trim()}`);
    });

    dashboardServerProcess.stderr?.on('data', (data) => {
      const error = data.toString().trim();
      // Ignore port already in use errors (server might already be running externally)
      if (!error.includes('EADDRINUSE')) {
        console.error(`[Dashboard Server] ${error}`);
      }
    });

    dashboardServerProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`Dashboard server exited with code ${code}`);
      }
      dashboardServerProcess = undefined;
    });

    dashboardServerProcess.on('error', (error) => {
      console.error('Failed to start dashboard server:', error);
      dashboardServerProcess = undefined;
    });

    // Clean up on extension deactivation
    context.subscriptions.push(
      new vscode.Disposable(() => {
        stopDashboardServer();
      })
    );
  } catch (error) {
    console.error('Error starting dashboard server:', error);
    dashboardServerProcess = undefined;
  }
}

function stopDashboardServer() {
  if (dashboardServerProcess && !dashboardServerProcess.killed) {
    console.log('Stopping dashboard server...');
    dashboardServerProcess.kill();
    dashboardServerProcess = undefined;
  }
}

export function deactivate() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  stopDashboardServer();
}
