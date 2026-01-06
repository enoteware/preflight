#!/usr/bin/env tsx
/**
 * Demo preflight check script for testing the VS Code extension
 * Includes a dummy API check using a public service
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local if it exists
// Simple parser (no dependency on dotenv package)
const envLocalPath = join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  try {
    const envContent = readFileSync(envLocalPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (error) {
    // Silently fail if we can't read .env.local
  }
}

interface CheckResult {
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: string;
  latency?: number;
  helpUrl?: string;
}

interface CheckSummary {
  category: string;
  results: CheckResult[];
}

// Check a public API endpoint (no auth required)
async function checkPublicAPI(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const response = await fetch('https://httpbin.org/json', {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Public API (httpbin.org) is reachable',
        details: `Status: ${response.status}`,
        latency,
        helpUrl: 'https://httpbin.org',
      };
    } else {
      return {
        status: 'warning',
        message: 'Public API returned non-OK status',
        details: `Status: ${response.status}`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'Public API check failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

// Check GitHub API (requires GITHUB_TOKEN)
async function checkGitHubAPI(): Promise<CheckResult> {
  const token = process.env.GITHUB_TOKEN;
  const startTime = Date.now();

  if (!token) {
    return {
      status: 'warning',
      message: 'GitHub API key not configured',
      details: 'Set GITHUB_TOKEN environment variable to test GitHub API',
      helpUrl: 'https://github.com/settings/tokens',
    };
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'preflight-check',
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'ok',
        message: 'GitHub API authenticated successfully',
        details: `Logged in as: ${data.login || 'authenticated user'}`,
        latency,
        helpUrl: 'https://github.com/settings/tokens',
      };
    } else if (response.status === 401) {
      return {
        status: 'error',
        message: 'GitHub API authentication failed',
        details: 'Invalid or expired GITHUB_TOKEN',
        latency,
        helpUrl: 'https://github.com/settings/tokens',
      };
    } else {
      return {
        status: 'warning',
        message: 'GitHub API returned unexpected status',
        details: `Status: ${response.status}`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'GitHub API check failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

// Check Node.js version
function checkNodeVersion(): CheckResult {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0], 10);
    
    if (majorVersion >= 18) {
      return {
        status: 'ok',
        message: `Node.js ${version} installed`,
        details: 'Version meets minimum requirement (18+)',
      };
    } else {
      return {
        status: 'warning',
        message: `Node.js ${version} installed`,
        details: 'Consider upgrading to Node.js 18 or higher',
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check Node.js version',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

// Check npm
function checkNpm(): CheckResult {
  try {
    const { execSync } = require('child_process');
    const version = execSync('npm --version', { encoding: 'utf-8' }).trim();
    return {
      status: 'ok',
      message: `npm ${version} installed`,
    };
  } catch (error) {
    // npm might not be in PATH, but that's okay for demo purposes
    return {
      status: 'warning',
      message: 'npm not found in PATH',
      details: 'npm may be available via npx or another package manager',
    };
  }
}

async function runChecks(quickMode = false): Promise<CheckSummary[]> {
  const summaries: CheckSummary[] = [];

  // CLI Tools
  const cliResults: CheckResult[] = [
    checkNodeVersion(),
    checkNpm(),
  ];
  summaries.push({ category: 'CLI Tools', results: cliResults });

  // Service Connections
  const serviceResults: CheckResult[] = [];
  
  // Always run API checks (they're fast and demonstrate the extension)
  const publicApiResult = await checkPublicAPI();
  serviceResults.push(publicApiResult);
  
  // Check authenticated API (GitHub)
  const githubApiResult = await checkGitHubAPI();
  serviceResults.push(githubApiResult);

  summaries.push({ category: 'Service Connections', results: serviceResults });

  return summaries;
}

async function main() {
  const args = process.argv.slice(2);
  const isJsonMode = args.includes('--json');
  const isQuickMode = args.includes('--quick');

  const summaries = await runChecks(isQuickMode);

  // JSON output mode (for VSCode extension)
  if (isJsonMode) {
    console.log(JSON.stringify({ summaries }, null, 2));
    // Exit with appropriate code
    let hasErrors = false;
    for (const summary of summaries) {
      for (const result of summary.results) {
        if (result.status === 'error') hasErrors = true;
      }
    }
    process.exit(hasErrors ? 1 : 0);
    return;
  }

  // Regular output mode
  console.log('\n🚀 PREFLIGHT CHECK\n');
  console.log('==================\n');

  for (const summary of summaries) {
    console.log(`📋 ${summary.category}`);
    for (const result of summary.results) {
      const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${icon} ${result.message}`);
      if (result.details) {
        console.log(`      ${result.details}`);
      }
      if (result.latency) {
        console.log(`      Latency: ${result.latency}ms`);
      }
    }
    console.log('');
  }

  // Calculate exit code
  let hasErrors = false;
  for (const summary of summaries) {
    for (const result of summary.results) {
      if (result.status === 'error') hasErrors = true;
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
