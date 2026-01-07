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
  
  // Create service validators
  writeFileSync(
    join(scriptsDir, 'services.ts'),
    `import { CheckResult } from './types';

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
import { checkGitHubAPI, checkPublicAPI } from './preflight-validators/services';
import { CheckResult, CheckSummary } from './preflight-validators/types';

async function runChecks(quickMode = false): Promise<CheckSummary[]> {
  const summaries: CheckSummary[] = [];
  
  // CLI Tools
  const cliResults: CheckResult[] = [
    checkNode(),
    checkPackageManager('npm'),
  ];
  summaries.push({ category: 'CLI Tools', results: cliResults });
  
  // Configuration: Environment Variables
  // These checks only verify if env vars are SET, not if services are reachable
  const envResults = validateEnvVars();
  summaries.push({ category: 'Configuration', results: envResults });
  
  // Service Connections: Connectivity checks
  // These make REAL API calls to verify your keys are working (not just set).
  // Each check will:
  // - Make an authenticated API request using the env var
  // - Verify response is 200 OK (key is valid)
  // - Return error if 401 (invalid/expired key) or other failures
  // This ensures your API keys are actually WORKING, not just configured.
  const serviceResults: CheckResult[] = [];
  
  // Always run public API check (fast, no auth required - verifies internet connectivity)
  const publicApiResult = await checkPublicAPI();
  serviceResults.push(publicApiResult);
  
  // Check authenticated APIs (if not in quick mode)
  // These verify your API keys are valid by making real authenticated requests
  if (!quickMode) {
    const githubApiResult = await checkGitHubAPI();
    serviceResults.push(githubApiResult);
  }
  
  summaries.push({ category: 'Service Connections', results: serviceResults });
  
  return summaries;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json') || args.includes('--status');
  const quick = args.includes('--quick');
  
  const summaries = await runChecks(quick);
  
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
    
    console.log(`📦 Project Type: ${project.type}`);
    console.log(`📦 Package Manager: ${project.packageManager}`);
    console.log(`📦 Root: ${project.rootDir}\n`);
    
    // Validate preconditions
    try {
      validatePreconditions(project);
    } catch (error) {
      console.error('❌ Setup failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
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
