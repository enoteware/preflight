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
  
  // Create types
  writeFileSync(
    join(scriptsDir, 'types.ts'),
    `export type CheckStatus = 'ok' | 'warning' | 'error';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  details?: string;
  helpUrl?: string;
  latency?: number;
  timestamp?: number;
}

export interface CheckSummary {
  category: string;
  results: CheckResult[];
}
`
  );
  
  // Create CLI validator
  writeFileSync(
    join(scriptsDir, 'cli.ts'),
    `import { execSync } from 'child_process';
import { CheckResult } from './types';

export function checkNode(): CheckResult {
  try {
    const version = execSync('node --version', { encoding: 'utf-8' }).trim();
    return {
      status: 'ok',
      message: \`Node.js \${version}\`,
    };
  } catch {
    return {
      status: 'error',
      message: 'Node.js not found',
      helpUrl: 'https://nodejs.org/',
    };
  }
}

export function checkPackageManager(pm: string): CheckResult {
  try {
    const cmd = pm === 'yarn' ? 'yarn --version' : pm === 'pnpm' ? 'pnpm --version' : 'npm --version';
    const version = execSync(cmd, { encoding: 'utf-8' }).trim();
    return {
      status: 'ok',
      message: \`\${pm} \${version}\`,
    };
  } catch {
    return {
      status: 'warning',
      message: \`\${pm} not found\`,
    };
  }
}
`
  );
  
  // Create env validator
  writeFileSync(
    join(scriptsDir, 'env.ts'),
    `import { CheckResult } from './types';

interface EnvVarConfig {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  format?: string;
  helpUrl?: string;
  description: string;
}

// Common environment variables - customize for your project
const envVarConfigs: EnvVarConfig[] = [
  {
    key: 'NODE_ENV',
    required: false,
    description: 'Node environment (development/production)',
  },
];

export function validateEnvVars(): CheckResult[] {
  const results: CheckResult[] = [];
  
  for (const config of envVarConfigs) {
    const value = process.env[config.key];
    
    if (!value) {
      results.push({
        status: config.required ? 'error' : 'warning',
        message: \`\${config.key}: NOT SET\`,
        details: config.description,
        helpUrl: config.helpUrl,
      });
      continue;
    }
    
    if (config.validator && !config.validator(value)) {
      results.push({
        status: 'error',
        message: \`\${config.key}: INVALID\`,
        details: \`Expected format: \${config.format}\`,
        helpUrl: config.helpUrl,
      });
      continue;
    }
    
    results.push({
      status: 'ok',
      message: \`\${config.key}: SET\`,
    });
  }
  
  return results;
}
`
  );
  
  // Create main preflight check script
  writeFileSync(
    join(project.rootDir, 'scripts', 'preflight-check.ts'),
    `#!/usr/bin/env tsx
/**
 * Preflight check - validates development environment
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '..', '.env.local') });

import { checkNode, checkPackageManager } from './preflight-validators/cli';
import { validateEnvVars } from './preflight-validators/env';
import { CheckResult, CheckSummary } from './preflight-validators/types';

async function runChecks(): Promise<CheckSummary[]> {
  const summaries: CheckSummary[] = [];
  
  // CLI Tools
  const cliResults: CheckResult[] = [
    checkNode(),
    checkPackageManager('npm'),
  ];
  summaries.push({ category: 'CLI Tools', results: cliResults });
  
  // Environment Variables
  const envResults = validateEnvVars();
  summaries.push({ category: 'Environment Variables', results: envResults });
  
  return summaries;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json') || args.includes('--status');
  const quick = args.includes('--quick');
  
  const summaries = await runChecks();
  
  // Add timestamps
  summaries.forEach(summary => {
    summary.results.forEach(result => {
      result.timestamp = Date.now();
    });
  });
  
  if (jsonOutput) {
    console.log(JSON.stringify({ summaries }, null, 2));
    process.exit(0);
  }
  
  console.log('\\n🔍 Preflight Check Results\\n');
  
  let hasErrors = false;
  let hasWarnings = false;
  
  for (const summary of summaries) {
    console.log(\`\\n📦 \${summary.category}\`);
    for (const result of summary.results) {
      const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(\`   \${icon} \${result.message}\`);
      if (result.details) {
        console.log(\`      \${result.details}\`);
      }
      if (result.helpUrl) {
        console.log(\`      Help: \${result.helpUrl}\`);
      }
      
      if (result.status === 'error') hasErrors = true;
      if (result.status === 'warning') hasWarnings = true;
    }
  }
  
  console.log('\\n' + '='.repeat(50) + '\\n');
  
  if (hasErrors) {
    console.log('❌ Some checks failed!');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  All checks passed with warnings');
    process.exit(0);
  } else {
    console.log('✅ All checks passed!');
    process.exit(0);
  }
}

main().catch(console.error);
`
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    .status-bar {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    
    .stat {
      text-align: center;
    }
    
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
    }
    
    .stat-label {
      color: #666;
      font-size: 0.9em;
      margin-top: 5px;
    }
    
    .category {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .category-title {
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .check-item {
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid;
      background: #f8f9fa;
      transition: all 0.3s ease;
    }
    
    .check-item:hover {
      transform: translateX(5px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .check-item.ok {
      border-left-color: #10b981;
      background: #ecfdf5;
    }
    
    .check-item.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    
    .check-item.error {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    
    .check-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .check-status {
      font-size: 1.2em;
      font-weight: bold;
    }
    
    .check-status.ok { color: #10b981; }
    .check-status.warning { color: #f59e0b; }
    .check-status.error { color: #ef4444; }
    
    .check-message {
      color: #666;
      margin-top: 5px;
    }
    
    .check-details {
      color: #888;
      font-size: 0.9em;
      margin-top: 5px;
    }
    
    .check-help {
      color: #667eea;
      text-decoration: none;
      font-size: 0.9em;
      margin-top: 5px;
      display: inline-block;
    }
    
    .check-help:hover {
      text-decoration: underline;
    }
    
    .heartbeat {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    
    .heartbeat.ok {
      background: #10b981;
    }
    
    .heartbeat.warning {
      background: #f59e0b;
    }
    
    .heartbeat.error {
      background: #ef4444;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    
    .last-update {
      text-align: center;
      color: white;
      margin-top: 20px;
      font-size: 0.9em;
    }
    
    .loading {
      text-align: center;
      color: white;
      font-size: 1.2em;
      padding: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Preflight Check Dashboard</h1>
    
    <div class="status-bar">
      <div class="stat">
        <div class="stat-value" id="total-checks">-</div>
        <div class="stat-label">Total Checks</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="ok-checks" style="color: #10b981;">-</div>
        <div class="stat-label">Passing</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="warning-checks" style="color: #f59e0b;">-</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="error-checks" style="color: #ef4444;">-</div>
        <div class="stat-label">Errors</div>
      </div>
    </div>
    
    <div id="content">
      <div class="loading">Loading checks...</div>
    </div>
    
    <div class="last-update" id="last-update">Last update: Never</div>
  </div>
  
  <script>
    let checkInterval;
    
    async function runChecks() {
      try {
        // Try to fetch from local JSON file (generated by npm run preflight:status)
        const response = await fetch('preflight-status.json?' + Date.now());
        if (response.ok) {
          const data = await response.json();
          updateDashboard(data);
          return;
        }
        throw new Error('No status file');
      } catch (error) {
        // Show error state with instructions
        document.getElementById('content').innerHTML = \`
          <div class="category">
            <div class="category-title">⚠️ Setup Required</div>
            <div class="check-item warning">
              <div class="check-header">
                <span class="check-status warning">Status file not found</span>
              </div>
              <div class="check-message">Run this command to generate status:</div>
              <div class="check-details" style="margin-top: 10px; font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                npm run preflight:status
              </div>
              <div class="check-details" style="margin-top: 10px;">
                The dashboard will auto-refresh once the file is created.
              </div>
            </div>
          </div>
        \`;
      }
    }
    
    function updateDashboard(data) {
      const content = document.getElementById('content');
      content.innerHTML = '';
      
      // Update stats
      let total = 0, ok = 0, warnings = 0, errors = 0;
      
      data.summaries.forEach(summary => {
        summary.results.forEach(result => {
          total++;
          if (result.status === 'ok') ok++;
          else if (result.status === 'warning') warnings++;
          else errors++;
        });
      });
      
      document.getElementById('total-checks').textContent = total;
      document.getElementById('ok-checks').textContent = ok;
      document.getElementById('warning-checks').textContent = warnings;
      document.getElementById('error-checks').textContent = errors;
      
      // Render categories
      data.summaries.forEach(summary => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        const title = document.createElement('div');
        title.className = 'category-title';
        title.textContent = \`📦 \${summary.category}\`;
        categoryDiv.appendChild(title);
        
        summary.results.forEach(result => {
          const checkDiv = document.createElement('div');
          checkDiv.className = \`check-item \${result.status}\`;
          
          const heartbeat = document.createElement('span');
          heartbeat.className = \`heartbeat \${result.status}\`;
          heartbeat.title = 'Live';
          
          const header = document.createElement('div');
          header.className = 'check-header';
          header.innerHTML = \`
            <span>
              \${heartbeat.outerHTML}
              <span class="check-status \${result.status}">\${result.message}</span>
            </span>
            \${result.latency ? \`<span style="color: #888; font-size: 0.9em;">\${result.latency}ms</span>\` : ''}
          \`;
          
          checkDiv.appendChild(header);
          
          if (result.details) {
            const details = document.createElement('div');
            details.className = 'check-details';
            details.textContent = result.details;
            checkDiv.appendChild(details);
          }
          
          if (result.helpUrl) {
            const help = document.createElement('a');
            help.className = 'check-help';
            help.href = result.helpUrl;
            help.target = '_blank';
            help.textContent = '📖 Help';
            checkDiv.appendChild(help);
          }
          
          categoryDiv.appendChild(checkDiv);
        });
        
        content.appendChild(categoryDiv);
      });
      
      // Update timestamp
      document.getElementById('last-update').textContent = 
        \`Last update: \${new Date().toLocaleTimeString()}\`;
    }
    
    // Initial load
    runChecks();
    
    // Auto-refresh every 5 seconds
    checkInterval = setInterval(runChecks, 5000);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (checkInterval) clearInterval(checkInterval);
    });
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
  let tasks = { version: '2.0.0', tasks: [] };
  
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

function main() {
  console.log('🚀 Setting up preflight checks...\n');
  
  const project = detectProject();
  
  console.log(`📦 Project Type: ${project.type}`);
  console.log(`📦 Package Manager: ${project.packageManager}`);
  console.log(`📦 Root: ${project.rootDir}\n`);
  
  if (!project.hasPackageJson) {
    console.log('⚠️  No package.json found. Creating basic structure...');
  }
  
  createPreflightStructure(project);
  
  // Create dashboard server script
  const dashboardServerPath = join(project.rootDir, 'scripts', 'serve-dashboard.ts');
  if (!existsSync(dashboardServerPath)) {
    writeFileSync(
      dashboardServerPath,
      `#!/usr/bin/env tsx
/**
 * Simple HTTP server for preflight dashboard
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = process.env.PORT || 8080;
const ROOT = process.cwd();

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
};

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
  console.log(\`\\n   Press Ctrl+C to stop\\n\`);
});
`
    );
  }
  
  console.log('\n✅ Preflight checks setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: npm install (to install tsx and dotenv)');
  console.log('   2. Run: npm run preflight (to test)');
  console.log('   3. Run: npm run preflight:status (to generate status JSON)');
  console.log('   4. Run: npm run preflight:dashboard (to start dashboard server)');
  console.log('   5. Open: http://localhost:8080 (in browser)');
}

main().catch(console.error);
