/**
 * Dashboard Webview Provider
 * Displays the preflight dashboard in a VS Code webview panel
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';

export class DashboardProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DashboardProvider.currentPanel) {
      DashboardProvider.currentPanel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'preflightDashboard',
      'Preflight Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'resources'),
        ],
      }
    );

    DashboardProvider.currentPanel = panel;

    // Set initial content
    DashboardProvider.updateContent(panel, context);

    // Handle panel disposal
    panel.onDidDispose(
      () => {
        DashboardProvider.currentPanel = undefined;
      },
      null,
      context.subscriptions
    );

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await DashboardProvider.updateContent(panel, context);
            break;
        }
      },
      null,
      context.subscriptions
    );
  }

  private static async updateContent(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    // Get the HTML content
    const html = DashboardProvider.getWebviewContent(panel.webview, context);

    // Run checks and get JSON output directly to preserve categories
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder open');
      }

      const execAsync = promisify(exec);

      const config = vscode.workspace.getConfiguration('preflight');
      const quickMode = config.get<boolean>('quickMode', true);

      const scriptPath = join(workspaceFolder.uri.fsPath, 'scripts', 'preflight-check.ts');
      
      // Check if script exists
      if (!existsSync(scriptPath)) {
        const errorData = {
          summaries: [{
            category: 'Error',
            results: [{
              status: 'warning',
              message: 'Preflight scripts not found',
              details: `Expected preflight check script at: scripts/preflight-check.ts\n\nRun 'npx @enoteware/preflight setup' to set up preflight checks in this workspace.`,
              helpUrl: 'https://github.com/enoteware/preflight',
            }],
          }],
        };
        const errorHtml = html.replace(
          '// DATA_PLACEHOLDER',
          `const initialData = ${JSON.stringify(errorData)};`
        );
        panel.webview.html = errorHtml;
        return;
      }

      const command = `npx tsx "${scriptPath}" --json ${quickMode ? '--quick' : ''}`;

      const { stdout } = await execAsync(command, {
        cwd: workspaceFolder.uri.fsPath,
        timeout: 30000,
      });

      const data = JSON.parse(stdout);

      // Inject the data into the HTML
      const htmlWithData = html.replace(
        '// DATA_PLACEHOLDER',
        `const initialData = ${JSON.stringify(data)};`
      );

      // Send update message to webview if it's already loaded
      panel.webview.postMessage({
        command: 'update',
        data: data,
      });

      // Set initial HTML if not set
      if (!panel.webview.html) {
        panel.webview.html = htmlWithData;
      }
    } catch (error) {
      const errorData = {
        summaries: [{
          category: 'Error',
          results: [{
            status: 'error',
            message: 'Failed to load checks',
            details: error instanceof Error ? error.message : String(error),
          }],
        }],
      };

      const errorHtml = html.replace(
        '// DATA_PLACEHOLDER',
        `const initialData = ${JSON.stringify(errorData)};`
      );
      
      panel.webview.postMessage({
        command: 'update',
        data: errorData,
      });

      if (!panel.webview.html) {
        panel.webview.html = errorHtml;
      }
    }
  }

  private static getWebviewContent(
    webview: vscode.Webview,
    context: vscode.ExtensionContext
  ): string {
    // Read the dashboard HTML file
    const dashboardPath = vscode.Uri.joinPath(
      context.extensionUri,
      '..',
      '..',
      'preflight-dashboard.html'
    );

    // For now, we'll embed the HTML directly
    // In production, you'd read from the file
    return DashboardProvider.getEmbeddedHtml();
  }

  private static getEmbeddedHtml(): string {
    // This will be the dashboard HTML with a placeholder for data injection
    // We'll read from the actual file or embed it
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preflight Check Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f5f5f7;
      min-height: 100vh;
      padding: 0;
      color: #1d1d1f;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      background: #ffffff;
      border-radius: 18px;
      padding: 40px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 0.5px solid rgba(0, 0, 0, 0.1);
    }

    h1 {
      font-size: 48px;
      font-weight: 600;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      color: #1d1d1f;
      line-height: 1.1;
    }

    .status-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 32px;
    }

    .status-item {
      padding: 20px;
      background: #f5f5f7;
      border-radius: 12px;
      text-align: center;
      border: 0.5px solid rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease;
    }

    .status-item:hover {
      background: #e8e8ed;
      transform: translateY(-1px);
    }

    .status-item .label {
      font-size: 13px;
      font-weight: 400;
      color: #86868b;
      margin-bottom: 8px;
      letter-spacing: -0.1px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-item .value {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .status-item.total .value { color: #1d1d1f; }
    .status-item.ok .value { color: #30d158; }
    .status-item.warning .value { color: #ff9f0a; }
    .status-item.error .value { color: #ff453a; }

    .controls {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 980px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 400;
      letter-spacing: -0.1px;
      transition: all 0.2s ease;
      font-family: inherit;
      display: flex;
      align-items: center;
    }

    .btn-primary {
      background: #007aff;
      color: white;
    }

    .btn-primary:hover {
      background: #0051d5;
      transform: scale(1.02);
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .btn-secondary {
      background: #f5f5f7;
      color: #1d1d1f;
      border: 0.5px solid rgba(0, 0, 0, 0.1);
    }

    .btn-secondary:hover {
      background: #e8e8ed;
      transform: scale(1.02);
    }

    .btn-secondary:active {
      transform: scale(0.98);
    }

    .last-updated {
      margin-top: 16px;
      color: #86868b;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: -0.1px;
    }

    .categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }

    .category {
      background: #ffffff;
      border-radius: 18px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 0.5px solid rgba(0, 0, 0, 0.1);
    }

    .category h2 {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.3px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
      color: #1d1d1f;
      display: flex;
      align-items: center;
    }

    .check-item {
      padding: 16px 20px;
      margin-bottom: 8px;
      border-radius: 12px;
      border-left: 3px solid;
      background: #f5f5f7;
      transition: all 0.2s ease;
      border: 0.5px solid rgba(0, 0, 0, 0.06);
    }

    .check-item:hover {
      transform: translateX(2px);
      background: #e8e8ed;
    }

    .check-item.ok {
      border-left-color: #30d158;
      background: #f0fdf4;
    }

    .check-item.ok:hover {
      background: #dcfce7;
    }

    .check-item.warning {
      border-left-color: #ff9f0a;
      background: #fffbf0;
    }

    .check-item.warning:hover {
      background: #fff4e0;
    }

    .check-item.error {
      border-left-color: #ff453a;
      background: #fff5f5;
    }

    .check-item.error:hover {
      background: #ffe5e5;
    }

    .check-header {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 5px;
    }

    .check-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      margin-right: 8px;
    }

    .status-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .category-icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .button-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      vertical-align: middle;
    }

    .check-message {
      font-weight: 400;
      font-size: 15px;
      letter-spacing: -0.1px;
      flex: 1;
      color: #1d1d1f;
    }

    .check-latency {
      color: #86868b;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: -0.1px;
    }

    .check-details {
      color: #86868b;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: -0.1px;
      margin-top: 8px;
      padding-left: 28px;
      line-height: 1.4;
    }

    .check-help {
      margin-top: 8px;
      padding-left: 28px;
    }

    .check-help a {
      color: #007aff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: -0.1px;
      transition: color 0.2s ease;
    }

    .check-help a:hover {
      color: #0051d5;
      text-decoration: underline;
    }

    .loading {
      text-align: center;
      padding: 60px 40px;
      color: #86868b;
      font-size: 17px;
      font-weight: 400;
      letter-spacing: -0.2px;
    }

    .pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
    }

    .auto-refresh label {
      font-size: 13px;
      font-weight: 400;
      color: #86868b;
      letter-spacing: -0.1px;
      cursor: pointer;
    }

    .auto-refresh input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #007aff;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Preflight Check</h1>
      <div class="controls">
        <button class="btn-primary" onclick="refreshChecks()">
          <svg class="button-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2V6M8 10V14M2 8H6M10 8H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13.657 2.343C12.146 0.832 10.137 0 8 0C5.863 0 3.854 0.832 2.343 2.343C0.832 3.854 0 5.863 0 8C0 10.137 0.832 12.146 2.343 13.657C3.854 15.168 5.863 16 8 16C10.137 16 12.146 15.168 13.657 13.657C15.168 12.146 16 10.137 16 8C16 5.863 15.168 3.854 13.657 2.343Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
          Refresh
        </button>
        <button class="btn-secondary" onclick="toggleAutoRefresh()">
          <svg class="button-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 4V8L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Auto-refresh
        </button>
      </div>
      <div class="auto-refresh">
        <input type="checkbox" id="autoRefresh" checked onchange="toggleAutoRefresh()">
        <label for="autoRefresh">Auto-refresh every 10 seconds</label>
      </div>
      <div class="last-updated" id="lastUpdated">Loading...</div>
      <div class="status-bar">
        <div class="status-item total">
          <div class="label">Total Checks</div>
          <div class="value" id="totalCount">-</div>
        </div>
        <div class="status-item ok">
          <div class="label">
            <svg class="status-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.707 5.293C17.098 5.684 17.098 6.316 16.707 6.707L8.707 14.707C8.316 15.098 7.684 15.098 7.293 14.707L3.293 10.707C2.902 10.316 2.902 9.684 3.293 9.293C3.684 8.902 4.316 8.902 4.707 9.293L8 12.586L15.293 5.293C15.684 4.902 16.316 4.902 16.707 5.293Z" fill="#30d158"/>
            </svg>
            Passing
          </div>
          <div class="value" id="okCount">-</div>
        </div>
        <div class="status-item warning">
          <div class="label">
            <svg class="status-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="#ff9f0a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            </svg>
            Warnings
          </div>
          <div class="value" id="warningCount">-</div>
        </div>
        <div class="status-item error">
          <div class="label">
            <svg class="status-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 10V6M10 10V14M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="#ff453a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
              <path d="M10 6V10M10 10V14" stroke="#ff453a" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Errors
          </div>
          <div class="value" id="errorCount">-</div>
        </div>
      </div>
    </header>

    <div id="content" class="loading">
      <div class="pulse">Loading checks...</div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let autoRefreshInterval = null;
    let initialData = null;

    // DATA_PLACEHOLDER

    async function refreshChecks() {
      const content = document.getElementById('content');
      content.innerHTML = '<div class="loading pulse">Running checks...</div>';

      // Request refresh from extension
      vscode.postMessage({ command: 'refresh' });
      
      // Wait a bit for the extension to update, then use initial data
      setTimeout(() => {
        if (initialData) {
          updateDashboard(initialData);
          updateLastUpdated();
        }
      }, 500);
    }

    function updateDashboard(data) {
      const content = document.getElementById('content');
      
      if (!data.summaries || data.summaries.length === 0) {
        content.innerHTML = '<div class="loading">No checks found</div>';
        return;
      }

      // Group by category
      const grouped = {};
      for (const summary of data.summaries) {
        if (!grouped[summary.category]) {
          grouped[summary.category] = [];
        }
        grouped[summary.category].push(...summary.results);
      }

      let html = '<div class="categories">';

      const categoryIcons = {
        'CLI Tools': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
        'Repository': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        'Service Connections': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 12H16M12 8V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        'Environment Checks': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
      };

      for (const [category, results] of Object.entries(grouped)) {
        const icon = categoryIcons[category] || '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>';
        html += \`<div class="category">
          <h2>\${icon}\${category}</h2>\`;

        for (const result of results) {
          const statusIcon = result.status === 'ok' 
            ? '<svg class="check-icon" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="#30d158" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : result.status === 'warning'
            ? '<svg class="check-icon" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3V6M6 9H6.01" stroke="#ff9f0a" stroke-width="1.5" stroke-linecap="round"/><path d="M6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1Z" stroke="#ff9f0a" stroke-width="1.5" fill="none"/></svg>'
            : '<svg class="check-icon" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3V6M6 9H6.01" stroke="#ff453a" stroke-width="1.5" stroke-linecap="round"/><path d="M6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1Z" stroke="#ff453a" stroke-width="1.5" fill="none"/></svg>';
          
          const latency = result.latency ? \` <span class="check-latency">(\${result.latency}ms)</span>\` : '';
          
          html += \`
            <div class="check-item \${result.status}">
              <div class="check-header">
                \${statusIcon}
                <span class="check-message">\${result.message}</span>
                \${latency}
              </div>\`;

          if (result.details) {
            html += \`<div class="check-details">\${result.details}</div>\`;
          }

          if (result.helpUrl) {
            html += \`<div class="check-help"><a href="\${result.helpUrl}" target="_blank">
              <svg style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12H8.01M8 8C8 6.34315 9.34315 5 11 5C12.6569 5 14 6.34315 14 8C14 9.65685 12.6569 11 11 11H8V8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                <path d="M8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
              Help</a></div>\`;
          }

          html += \`</div>\`;
        }

        html += \`</div>\`;
      }

      html += '</div>';
      content.innerHTML = html;

      // Update status counts
      let total = 0, ok = 0, warnings = 0, errors = 0;
      for (const summary of data.summaries) {
        for (const result of summary.results) {
          total++;
          if (result.status === 'ok') ok++;
          else if (result.status === 'warning') warnings++;
          else if (result.status === 'error') errors++;
        }
      }

      document.getElementById('totalCount').textContent = total;
      document.getElementById('okCount').textContent = ok;
      document.getElementById('warningCount').textContent = warnings;
      document.getElementById('errorCount').textContent = errors;
    }

    function updateLastUpdated() {
      const now = new Date();
      document.getElementById('lastUpdated').textContent = 
        \`Last updated: \${now.toLocaleTimeString()}\`;
    }

    function toggleAutoRefresh() {
      const checkbox = document.getElementById('autoRefresh');
      if (checkbox.checked) {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(refreshChecks, 10000);
      } else {
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
          autoRefreshInterval = null;
        }
      }
    }

    // Initial load
    if (initialData) {
      updateDashboard(initialData);
      updateLastUpdated();
    } else {
      refreshChecks();
    }
    
    // Start auto-refresh if enabled
    if (document.getElementById('autoRefresh').checked) {
      toggleAutoRefresh();
    }

    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'update') {
        initialData = message.data;
        updateDashboard(initialData);
        updateLastUpdated();
      }
    });
  </script>
</body>
</html>`;
  }
}
