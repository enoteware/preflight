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
    public readonly latency?: number,
    public readonly envFilePath?: string,
    public readonly envLineNumber?: number
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
    let tooltipText = details || label;
    if (envFilePath) {
      tooltipText += `\n\n📄 Found in: ${envFilePath}${envLineNumber ? `:${envLineNumber}` : ''}`;
    }
    this.tooltip = tooltipText;

    // Add latency to description
    if (latency) {
      this.description = `${latency}ms`;
    }

    // Set context value for menu items (prioritize env file over help URL)
    if (envFilePath) {
      this.contextValue = 'check-with-env-file';
    } else if (helpUrl) {
      this.contextValue = 'check-with-help';
    } else {
      this.contextValue = 'check';
    }

    // Make it clickable if there's an env file (prioritize over help URL)
    if (envFilePath) {
      // Command will be registered in extension.ts to open the file at the line
      this.command = {
        command: 'preflight.openEnvFile',
        title: 'Open Environment File',
        arguments: [envFilePath, envLineNumber],
      };
    } else if (helpUrl) {
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
          check.latency,
          check.envFilePath,
          check.envLineNumber
        )
    );

    return Promise.resolve(items);
  }
}
