/**
 * Status Bar Integration
 */

import * as vscode from 'vscode';
import type { StatusSummary } from './types';

export class PreflightStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private dashboardItem: vscode.StatusBarItem;

  constructor() {
    // Main status item (shows check summary)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = 'preflight.runCheck';
    this.statusBarItem.show();

    // Dashboard button (opens dashboard view)
    this.dashboardItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    this.dashboardItem.text = '$(dashboard) Dashboard';
    this.dashboardItem.tooltip = 'Open Preflight Dashboard';
    this.dashboardItem.command = 'preflight.openDashboard';
    this.dashboardItem.show();

    this.updateStatus({ total: 0, ok: 0, warnings: 0, errors: 0 });
  }

  updateStatus(summary: StatusSummary): void {
    const config = vscode.workspace.getConfiguration('preflight');
    const showInStatusBar = config.get<boolean>('showInStatusBar', true);

    if (!showInStatusBar) {
      this.statusBarItem.hide();
      this.dashboardItem.hide();
      return;
    }

    // Always show dashboard button if status bar is enabled
    this.dashboardItem.show();

    // Determine icon and color based on status
    let icon = '$(check)';
    let color: vscode.ThemeColor | undefined;
    let textColor: vscode.ThemeColor | undefined;

    if (summary.errors > 0) {
      // Red for errors (something is down)
      icon = '$(error)';
      color = new vscode.ThemeColor('statusBarItem.errorBackground');
      textColor = new vscode.ThemeColor('statusBarItem.errorForeground');
    } else if (summary.warnings > 0) {
      // Orange/yellow for warnings (potential issues)
      icon = '$(warning)';
      color = new vscode.ThemeColor('statusBarItem.warningBackground');
      textColor = new vscode.ThemeColor('statusBarItem.warningForeground');
    } else if (summary.ok > 0 && summary.total > 0 && summary.ok === summary.total) {
      // Green for all passing (everything is up)
      icon = '$(check)';
      color = new vscode.ThemeColor('preflight.statusBar.successBackground');
      textColor = new vscode.ThemeColor('preflight.statusBar.successForeground');
    } else {
      // Default/gray when no checks or partial status
      icon = '$(circle-slash)';
      color = undefined;
      textColor = undefined;
    }

    // Build text
    const text = `${icon} Preflight: ${summary.ok}/${summary.total}`;

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = this.buildTooltip(summary);
    this.statusBarItem.backgroundColor = color;
    this.statusBarItem.color = textColor;

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
    this.dashboardItem.dispose();
  }
}
