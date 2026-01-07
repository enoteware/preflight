#!/usr/bin/env tsx
/**
 * Repo-agnostic preflight check setup script
 * 
 * Usage: npx tsx scripts/setup-preflight.ts
 * Or: /setup-preflight (as a Cursor command)
 * 
 * This script sets up preflight checks in any repository by:
 * 1. Detecting project type (Next.js, Node.js, etc.)
 * 2. Creating preflight check structure
 * 3. Adding npm scripts
 * 4. Setting up VSCode integration
 * 5. Creating a real-time HTML dashboard
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadTemplate } from './utils/templateLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProjectInfo {
  type: 'nextjs' | 'node' | 'unknown';
  hasPackageJson: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  rootDir: string;
}

function detectProject(): ProjectInfo {
  const cwd = process.cwd();
  const packageJsonPath = join(cwd, 'package.json');
  const hasPackageJson = existsSync(packageJsonPath);
  
  let type: ProjectInfo['type'] = 'unknown';
  let packageManager: ProjectInfo['packageManager'] = 'unknown';
  
  if (hasPackageJson) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.next || deps['next.js']) {
        type = 'nextjs';
      } else if (deps.express || deps.fastify || packageJson.type === 'module' || packageJson.type === 'commonjs') {
        type = 'node';
      }
      
      // Detect package manager
      if (existsSync(join(cwd, 'yarn.lock'))) {
        packageManager = 'yarn';
      } else if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
        packageManager = 'pnpm';
      } else if (existsSync(join(cwd, 'package-lock.json'))) {
        packageManager = 'npm';
      }
    } catch (error) {
      console.error('Error reading package.json:', error);
    }
  }
  
  return { type, hasPackageJson, packageManager, rootDir: cwd };
}

function createPreflightStructure(project: ProjectInfo) {
  const scriptsDir = join(project.rootDir, 'scripts', 'preflight-validators');
  mkdirSync(scriptsDir, { recursive: true });
  
  // Create types (always overwrite - this is a core file)
  writeFileSync(
    join(scriptsDir, 'types.ts'),
    loadTemplate('types.ts')
  );
  
  // Create CLI validator (always overwrite - this is a core file)
  writeFileSync(
    join(scriptsDir, 'cli.ts'),
    loadTemplate('cli.ts')
  );
  
  // Create env validator (always overwrite - this is a core file)
  writeFileSync(
    join(scriptsDir, 'env.ts'),
    loadTemplate('env.ts')
  );
  
  // Create service validators (only if doesn't exist - preserve custom checks)
  const servicesPath = join(scriptsDir, 'services.ts');
  if (!existsSync(servicesPath)) {
    writeFileSync(servicesPath, loadTemplate('services.ts'));
  } else {
    console.log('   ℹ️  services.ts already exists - preserving custom service checks');
  }
  
  // Create main preflight check script
  writeFileSync(
    join(project.rootDir, 'scripts', 'preflight-check.ts'),
    loadTemplate('preflight-check.ts')
  );
  
  // Create HTML dashboard
  createDashboard(project);
  
  // Update package.json
  updatePackageJson(project);
  
  // Create VSCode config
  createVSCodeConfig(project);
}

function createDashboard(project: ProjectInfo) {
  const dashboardPath = join(project.rootDir, 'preflight-dashboard.html');
  
  writeFileSync(
    dashboardPath,
    `<!DOCTYPE html>
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
    
    <!-- REPO_INFO_PLACEHOLDER -->
  </div>

  <script>
    let autoRefreshInterval = null;

    async function refreshChecks() {
      const content = document.getElementById('content');
      content.innerHTML = '<div class="loading pulse">Running checks...</div>';

      try {
        // Run preflight check and get JSON output
        const response = await fetch('/preflight-status.json');
        let data;
        
        if (response.ok) {
          data = await response.json();
        } else {
          // If status.json doesn't exist, try running the script directly
          // This requires a server that can execute the script
          throw new Error('Status file not found. Make sure to run: npx tsx scripts/preflight-check.ts --json > preflight-status.json');
        }

        updateDashboard(data);
        updateLastUpdated();
      } catch (error) {
        content.innerHTML = \`
          <div class="category">
            <h2>Error</h2>
            <div class="check-item error">
              <div class="check-header">
                <svg class="check-icon" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 3V6M6 9H6.01" stroke="#ff453a" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1Z" stroke="#ff453a" stroke-width="1.5" fill="none"/>
                </svg>
                <span class="check-message">Failed to load checks</span>
              </div>
              <div class="check-details">\${error.message}</div>
              <div class="check-details" style="margin-top: 10px;">
                <strong>To use this dashboard:</strong><br>
                1. Run: <code>npx tsx scripts/preflight-check.ts --json > preflight-status.json</code><br>
                2. Or start the dashboard server: <code>npx tsx scripts/serve-dashboard.ts</code>
              </div>
            </div>
          </div>
        \`;
      }
    }

    function updateDashboard(data) {
      const content = document.getElementById('content');
      
      if (!data.summaries || data.summaries.length === 0) {
        content.innerHTML = '<div class="loading">No checks found</div>';
        return;
      }

      let html = '<div class="categories">';

      // Category icons mapping
      const categoryIcons = {
        'CLI Tools': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
        'Repository': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        'Service Connections': '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 12H16M12 8V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      };

      for (const summary of data.summaries) {
        const icon = categoryIcons[summary.category] || '<svg class="category-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>';
        html += \`<div class="category">
          <h2>\${icon}\${summary.category}</h2>\`;

        for (const result of summary.results) {
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
    refreshChecks();
    
    // Start auto-refresh if enabled
    if (document.getElementById('autoRefresh').checked) {
      toggleAutoRefresh();
    }
  </script>
</body>
</html>
`
  );
  
  console.log(`✅ Created dashboard: ${dashboardPath}`);
  console.log(`   Open in browser: file://${dashboardPath}`);
}

function updatePackageJson(project: ProjectInfo) {
  const packageJsonPath = join(project.rootDir, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    console.log('⚠️  No package.json found, skipping npm scripts');
    return;
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  packageJson.scripts.preflight = 'tsx scripts/preflight-check.ts';
  packageJson.scripts['preflight:quick'] = 'tsx scripts/preflight-check.ts --quick';
  packageJson.scripts['preflight:status'] = 'tsx scripts/preflight-check.ts --json > preflight-status.json';
  packageJson.scripts['preflight:dashboard'] = 'tsx scripts/serve-dashboard.ts';
  packageJson.scripts['preflight:verify'] = 'tsx scripts/verify-setup.ts';
  
  // Add tsx as dev dependency if not present
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  if (!packageJson.devDependencies.tsx) {
    packageJson.devDependencies.tsx = '^4.7.0';
  }
  if (!packageJson.devDependencies.dotenv) {
    packageJson.devDependencies.dotenv = '^16.3.1';
  }
  
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✅ Updated package.json with preflight scripts');
}

function createVSCodeConfig(project: ProjectInfo) {
  const vscodeDir = join(project.rootDir, '.vscode');
  mkdirSync(vscodeDir, { recursive: true });
  
  const tasksPath = join(vscodeDir, 'tasks.json');
  let tasks: { version: string; tasks: any[] } = { version: '2.0.0', tasks: [] };
  
  if (existsSync(tasksPath)) {
    try {
      tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));
    } catch {
      // Use default
    }
  }
  
  // Add preflight task if not exists
  const hasPreflightTask = tasks.tasks.some((t: any) => t.label?.includes('Preflight'));
  
  if (!hasPreflightTask) {
    tasks.tasks.push({
      label: 'Preflight Check (Quick - Auto)',
      type: 'npm',
      script: 'preflight:quick',
      group: { kind: 'build', isDefault: false },
      presentation: {
        reveal: 'silent',
        panel: 'dedicated',
        showReuseMessage: false,
        clear: true,
      },
      runOptions: {
        runOn: 'folderOpen',
      },
      problemMatcher: [],
    });
  }
  
  writeFileSync(tasksPath, JSON.stringify(tasks, null, 2) + '\n');
  
  // Update settings
  const settingsPath = join(vscodeDir, 'settings.json');
  let settings: any = {};
  
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      // Use default
    }
  }
  
  settings['task.allowAutomaticTasks'] = true;
  
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  
  console.log('✅ Created VSCode configuration');
}

function validatePreconditions(project: ProjectInfo): void {
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion < 18) {
    throw new Error(
      `Preflight requires Node.js 18 or higher. You have ${nodeVersion}.\n` +
      'Please upgrade Node.js: https://nodejs.org/'
    );
  }

  // Check write permissions
  const scriptsDir = join(project.rootDir, 'scripts');
  try {
    mkdirSync(scriptsDir, { recursive: true });
  } catch (_error) {
    throw new Error(
      `Cannot create scripts directory: ${scriptsDir}\n` +
      'Check that you have write permissions in the project directory.'
    );
  }

  // Check if package.json is writable (if it exists)
  if (project.hasPackageJson) {
    const packageJsonPath = join(project.rootDir, 'package.json');
    try {
      const existing = readFileSync(packageJsonPath, 'utf-8');
      JSON.parse(existing); // Validate it's valid JSON
    } catch (_error) {
      throw new Error(
        `Cannot read or parse package.json: ${packageJsonPath}\n` +
        'Please fix any JSON syntax errors before running setup.'
      );
    }
  }
}

async function validateSetup(project: ProjectInfo): Promise<boolean> {
  console.log('\n🔍 Validating setup...\n');
  
  let allGood = true;
  
  // Check if required files exist
  const requiredFiles = [
    join(project.rootDir, 'scripts', 'preflight-check.ts'),
    join(project.rootDir, 'scripts', 'preflight-validators', 'types.ts'),
    join(project.rootDir, 'scripts', 'preflight-validators', 'cli.ts'),
    join(project.rootDir, 'scripts', 'preflight-validators', 'env.ts'),
    join(project.rootDir, 'scripts', 'preflight-validators', 'services.ts'),
  ];
  
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      console.log(`  ✅ ${file.replace(project.rootDir + '/', '')}`);
    } else {
      console.log(`  ❌ ${file.replace(project.rootDir + '/', '')} - MISSING`);
      allGood = false;
    }
  }
  
  // Check if tsx is available
  try {
    execSync('npx tsx --version', { stdio: 'ignore', timeout: 5000 });
    console.log('  ✅ tsx is available');
  } catch {
    console.log('  ⚠️  tsx not found (will be installed with npm install)');
  }
  
  // Check if dotenv is in package.json (if package.json exists)
  if (project.hasPackageJson) {
    try {
      const packageJson = JSON.parse(readFileSync(join(project.rootDir, 'package.json'), 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.tsx && deps.dotenv) {
        console.log('  ✅ tsx and dotenv in package.json');
      } else {
        console.log('  ⚠️  Run "npm install" to install tsx and dotenv');
        allGood = false;
      }
    } catch {
      // Ignore
    }
  }
  
  return allGood;
}

function updateExistingInstallation(project: ProjectInfo): boolean {
  const preflightCheckPath = join(project.rootDir, 'scripts', 'preflight-check.ts');
  const servicesPath = join(project.rootDir, 'scripts', 'preflight-validators', 'services.ts');
  
  if (!existsSync(preflightCheckPath)) {
    console.log('❌ No existing Preflight installation found.');
    console.log('   Run without --update flag to do a fresh setup.\n');
    return false;
  }
  
  console.log('🔄 Updating existing Preflight installation...\n');
  
  // Check if already updated (has "Configuration" category)
  const existingCheck = readFileSync(preflightCheckPath, 'utf-8');
  if (existingCheck.includes("category: 'Configuration'")) {
    console.log('✅ Your installation is already up to date!\n');
    return true;
  }
  
  // Update services.ts if it exists
  if (existsSync(servicesPath)) {
    console.log('📝 Updating services.ts...');
    // Regenerate services.ts with new structure
    const scriptsDir = join(project.rootDir, 'scripts', 'preflight-validators');
    mkdirSync(scriptsDir, { recursive: true });
    
    // Read the existing services.ts to preserve custom checks
    const existingServices = readFileSync(servicesPath, 'utf-8');
    
    // Check if it needs updating (old pattern: returns warning when token missing)
    if (existingServices.includes("status: 'warning'") && existingServices.includes('not configured')) {
      // Backup existing file
      const backupPath = join(scriptsDir, 'services.ts.backup');
      writeFileSync(backupPath, existingServices);
      console.log(`   💾 Backup saved to: ${backupPath.replace(project.rootDir + '/', '')}`);
      
      // Regenerate with new structure
      // Note: This will overwrite custom checks, but we have a backup
      const newServicesContent = getServicesTemplate();
      writeFileSync(servicesPath, newServicesContent);
      console.log('   ✅ Updated services.ts (old version backed up)');
      console.log('   ⚠️  If you had custom service checks, restore them from the backup\n');
    } else {
      console.log('   ℹ️  services.ts appears to already be updated\n');
    }
  }
  
  // Update preflight-check.ts category name
  console.log('📝 Updating preflight-check.ts...');
  let updatedCheck = existingCheck;
  
  // Replace old category name
  updatedCheck = updatedCheck.replace(
    /category: 'Environment Variables'/g,
    "category: 'Configuration'"
  );
  
  // Add comment if not present
  if (!updatedCheck.includes('// Configuration: Environment Variables')) {
    updatedCheck = updatedCheck.replace(
      /\/\/ Environment Variables/,
      '// Configuration: Environment Variables\n  // These checks only verify if env vars are SET, not if services are reachable'
    );
  }
  
  // Add comment for Service Connections if not present
  if (!updatedCheck.includes('// Service Connections: Connectivity checks')) {
    updatedCheck = updatedCheck.replace(
      /\/\/ Service Connections/,
      '// Service Connections: Connectivity checks\n  // These verify services are reachable and responding (only if env vars are set)'
    );
  }
  
  // Backup existing file
  const backupPath = join(project.rootDir, 'scripts', 'preflight-check.ts.backup');
  writeFileSync(backupPath, existingCheck);
  writeFileSync(preflightCheckPath, updatedCheck);
  
  console.log(`   💾 Backup saved to: ${backupPath.replace(project.rootDir + '/', '')}`);
  console.log('   ✅ Updated preflight-check.ts\n');
  
  return true;
}

function getServicesTemplate(): string {
  // Return the new services.ts template (same as in createPreflightStructure)
  return `import { CheckResult } from './types';

/**
 * Service connection checks - these verify that services are reachable and responding.
 * These checks only run if the corresponding environment variable is set.
 * 
 * IMPORTANT: These checks make REAL API calls to verify your keys are working.
 * A service check will:
 * 1. Check if the env var exists (skip if missing)
 * 2. Make an authenticated API call using the key
 * 3. Verify the response is 200 OK (key is valid and working)
 * 4. Return error if 401 (invalid/expired key) or other failures
 * 
 * This ensures your API keys are not just SET, but actually WORKING.
 * 
 * To add a new service check:
 * 1. Create a function that checks if the env var exists
 * 2. If it exists, make an API call with the key to verify it works
 * 3. Check response.status === 200 to confirm key is valid
 * 4. Return a CheckResult with status, message, latency, and details
 */

/**
 * Check GitHub API connection (requires GITHUB_TOKEN)
 * 
 * This makes a REAL API call to verify your GITHUB_TOKEN is valid and working.
 * It calls https://api.github.com/user which requires authentication.
 * 
 * Results:
 * - ✅ 200 OK: Token is valid and working (shows authenticated username)
 * - ❌ 401: Token is invalid, expired, or revoked
 * - ❌ Timeout/Network: Service unreachable
 * 
 * This ensures your key is not just SET, but actually WORKING.
 */
export async function checkGitHubAPI(): Promise<CheckResult> {
  const token = process.env.GITHUB_TOKEN;
  const startTime = Date.now();

  // Skip if env var not set (that's a configuration issue, not connectivity)
  if (!token) {
    return {
      status: 'warning',
      message: 'GitHub API: Not checked (GITHUB_TOKEN not set)',
      details: 'Set GITHUB_TOKEN environment variable to enable this check',
      helpUrl: 'https://github.com/settings/tokens',
    };
  }

  try {
    // Make REAL API call to verify the token works
    // This endpoint requires authentication - if we get 200, the key is valid
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'preflight-check',
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    // 200 OK = Key is valid and working!
    if (response.ok) {
      const data = await response.json();
      return {
        status: 'ok',
        message: 'GitHub API: 200 OK',
        details: \`✅ Key verified - Authenticated as: \${data.login || 'authenticated user'} (\${latency}ms)\`,
        latency,
        helpUrl: 'https://github.com/settings/tokens',
      };
    } else if (response.status === 401) {
      // 401 = Key is invalid, expired, or revoked
      return {
        status: 'error',
        message: 'GitHub API: Authentication failed',
        details: \`❌ Key is invalid or expired (HTTP \${response.status}, \${latency}ms)\`,
        latency,
        helpUrl: 'https://github.com/settings/tokens',
      };
    } else {
      return {
        status: 'warning',
        message: \`GitHub API: Unexpected status \${response.status}\`,
        details: \`\${response.statusText} (\${latency}ms)\`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        status: 'error',
        message: 'GitHub API: Timeout',
        details: \`Request timed out after 5s\`,
        latency,
      };
    }
    return {
      status: 'error',
      message: 'GitHub API: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

/**
 * Check a public API endpoint (no auth required)
 * This verifies general internet connectivity
 */
export async function checkPublicAPI(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const response = await fetch('https://httpbin.org/json', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Public API: 200 OK',
        details: \`httpbin.org is reachable (\${latency}ms)\`,
        latency,
        helpUrl: 'https://httpbin.org',
      };
    } else {
      return {
        status: 'warning',
        message: \`Public API: Status \${response.status}\`,
        details: \`\${response.statusText} (\${latency}ms)\`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        status: 'error',
        message: 'Public API: Timeout',
        details: \`Request timed out after 5s\`,
        latency,
      };
    }
    return {
      status: 'error',
      message: 'Public API: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

// Add more service checks as needed:
// 
// CRITICAL: Always make a REAL API call to verify the key works!
// Don't just check if the key exists - test it with an authenticated request.
//
// Example pattern:
// export async function checkOpenAI(): Promise<CheckResult> {
//   const apiKey = process.env.OPENAI_API_KEY;
//   if (!apiKey) {
//     return { status: 'warning', message: 'OpenAI API: Not checked (OPENAI_API_KEY not set)' };
//   }
//   
//   // Make REAL API call to verify key works
//   const response = await fetch('https://api.openai.com/v1/models', {
//     headers: { 'Authorization': \`Bearer \${apiKey}\` },
//     signal: AbortSignal.timeout(5000),
//   });
//   
//   if (response.ok) {
//     return { status: 'ok', message: 'OpenAI API: 200 OK', details: 'Key verified and working' };
//   } else if (response.status === 401) {
//     return { status: 'error', message: 'OpenAI API: Invalid key', details: 'Key is invalid or expired' };
//   }
//   // ... handle other cases
// }
`;
}

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update') || args.includes('update');
  
  if (isUpdate) {
    const project = detectProject();
    const updated = updateExistingInstallation(project);
    if (updated) {
      console.log('✅ Update complete!');
      console.log('\n📋 What changed:');
      console.log('   • Category "Environment Variables" → "Configuration"');
      console.log('   • Service checks now skip if env vars are missing');
      console.log('   • Clearer separation between config and connectivity issues');
      console.log('\n💡 Next steps:');
      console.log('   • Review your backup files (if any were created)');
      console.log('   • Run: npm run preflight (to test)');
      console.log('   • Check the VS Code extension to see the new categories\n');
    }
    return;
  }
  
  console.log('🚀 Setting up preflight checks...\n');
  
  try {
    const project = detectProject();
    
    // Validate preconditions FIRST (before showing project info)
    try {
      validatePreconditions(project);
    } catch (error) {
      console.error('❌ Setup failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
    console.log(`📦 Project Type: ${project.type}`);
    console.log(`📦 Package Manager: ${project.packageManager}`);
    console.log(`📦 Root: ${project.rootDir}\n`);
    
    if (!project.hasPackageJson) {
      console.log('⚠️  No package.json found. Creating basic structure...');
    }
    
    createPreflightStructure(project);
  
  // Copy verify script (if it exists in the repo)
  const verifyScriptPath = join(project.rootDir, 'scripts', 'verify-setup.ts');
  if (!existsSync(verifyScriptPath)) {
    // Try to find verify script in the preflight repo
    const possiblePaths = [
      join(__dirname, '..', 'scripts', 'verify-setup.ts'),
      join(__dirname, '..', '..', 'scripts', 'verify-setup.ts'),
    ];
    
    for (const verifyScriptSource of possiblePaths) {
      if (existsSync(verifyScriptSource)) {
        const verifyContent = readFileSync(verifyScriptSource, 'utf-8');
        writeFileSync(verifyScriptPath, verifyContent);
        console.log(`✅ Created verification script: scripts/verify-setup.ts`);
        break;
      }
    }
  }
  
  // Create dashboard server script
  const dashboardServerPath = join(project.rootDir, 'scripts', 'serve-dashboard.ts');
  if (!existsSync(dashboardServerPath)) {
    writeFileSync(
      dashboardServerPath,
      `#!/usr/bin/env tsx
/**
 * HTTP server for preflight dashboard with auto-refresh
 * Periodically runs checks and regenerates preflight-status.json
 */

import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';

const PORT = process.env.PORT || 8080;
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL || '10', 10) * 1000; // Default 10 seconds
const ROOT = process.cwd();
const CHECK_SCRIPT = join(ROOT, 'scripts', 'preflight-check.ts');
const STATUS_FILE = join(ROOT, 'preflight-status.json');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
};

// Run preflight checks and update status file
async function runChecks() {
  if (!existsSync(CHECK_SCRIPT)) {
    return;
  }
  
  try {
    const output = execSync(\`npx tsx "\${CHECK_SCRIPT}" --json --quick\`, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30000,
    });
    
    // Write to status file
    writeFileSync(STATUS_FILE, output);
    console.log(\`[Dashboard] Status updated at \${new Date().toLocaleTimeString()}\`);
  } catch (error) {
    console.error('[Dashboard] Failed to run checks:', error instanceof Error ? error.message : String(error));
  }
}

// Run initial check
runChecks();

// Set up periodic refresh
const refreshInterval = setInterval(runChecks, REFRESH_INTERVAL);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(refreshInterval);
  process.exit(0);
});

const server = createServer((req, res) => {
  let filePath = join(ROOT, req.url === '/' ? 'preflight-dashboard.html' : req.url!);
  
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  if (!existsSync(filePath)) {
    filePath = join(ROOT, 'preflight-dashboard.html');
  }
  
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }
  
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500);
    res.end('Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(\`\\n🚀 Preflight Dashboard Server\`);
  console.log(\`   URL: http://localhost:\${PORT}\`);
  console.log(\`   Dashboard: http://localhost:\${PORT}/preflight-dashboard.html\`);
  console.log(\`   Auto-refresh: Every \${REFRESH_INTERVAL / 1000} seconds\`);
  console.log(\`\\n   Press Ctrl+C to stop\\n\`);
});
`
    );
  }
  
    // Validate setup
    const setupValid = await validateSetup(project);
    
    console.log('\n✅ Preflight checks setup complete!');
    
    if (!setupValid) {
      console.log('\n⚠️  Some validation checks failed. Please review the output above.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('   [ ] 1. Run: npm install (to install tsx and dotenv)');
    console.log('   [ ] 2. Run: npm run preflight (to test checks)');
    console.log('   [ ] 3. Run: npm run preflight:status (to generate status JSON)');
    console.log('   [ ] 4. Run: npm run preflight:dashboard (to start dashboard server)');
    console.log('   [ ] 5. Open: http://localhost:8080 (in browser)');
    console.log('\n💡 Tip: Customize env.ts and services.ts in scripts/preflight-validators/ for your project');
  } catch (error) {
    console.error('\n❌ Setup failed:', error instanceof Error ? error.message : String(error));
    console.error('\nIf you need help, check: https://github.com/enoteware/preflight');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
