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
