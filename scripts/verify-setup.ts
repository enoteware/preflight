#!/usr/bin/env tsx
/**
 * Preflight Setup Verification Script
 * Checks that Preflight is properly installed and configured
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface VerificationResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
}

const results: VerificationResult[] = [];

function check(name: string, checkFn: () => boolean, errorMessage: string, fix?: string): void {
  try {
    if (checkFn()) {
      results.push({ name, status: 'ok', message: '✅ Pass' });
    } else {
      results.push({ name, status: 'error', message: errorMessage, fix });
    }
  } catch (error) {
    results.push({ 
      name, 
      status: 'error', 
      message: `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      fix 
    });
  }
}

// Check 1: Required files exist
check(
  'Preflight Scripts',
  () => {
    const requiredFiles = [
      'scripts/preflight-check.ts',
      'scripts/preflight-validators/types.ts',
      'scripts/preflight-validators/cli.ts',
      'scripts/preflight-validators/env.ts',
      'scripts/preflight-validators/services.ts',
    ];
    return requiredFiles.every(file => existsSync(join(process.cwd(), file)));
  },
  'Missing required preflight files',
  'Run: npx @enoteware/preflight setup'
);

// Check 2: tsx is available
check(
  'tsx Runtime',
  () => {
    try {
      execSync('npx tsx --version', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },
  'tsx is not available',
  'Run: npm install --save-dev tsx'
);

// Check 3: dotenv is in package.json
check(
  'dotenv Package',
  () => {
    if (!existsSync('package.json')) return false;
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      return !!deps.dotenv;
    } catch {
      return false;
    }
  },
  'dotenv not found in package.json',
  'Run: npm install --save-dev dotenv'
);

// Check 4: npm scripts exist
check(
  'npm Scripts',
  () => {
    if (!existsSync('package.json')) return false;
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const scripts = packageJson.scripts || {};
      return !!scripts.preflight;
    } catch {
      return false;
    }
  },
  'preflight npm scripts not found',
  'Run: npx @enoteware/preflight setup'
);

// Check 5: Preflight check script is executable
check(
  'Check Script Syntax',
  () => {
    const scriptPath = join(process.cwd(), 'scripts', 'preflight-check.ts');
    if (!existsSync(scriptPath)) return false;
    try {
      // Try to parse/validate TypeScript (basic check)
      const content = readFileSync(scriptPath, 'utf-8');
      return content.includes('runChecks') && content.includes('CheckResult');
    } catch {
      return false;
    }
  },
  'preflight-check.ts appears to be invalid',
  'Run: npx @enoteware/preflight setup to regenerate'
);

// Check 6: Extension installed (optional)
check(
  'VS Code Extension',
  () => {
    try {
      // Try to detect if extension is installed
      const output = execSync('code --list-extensions 2>/dev/null || cursor --list-extensions 2>/dev/null', { 
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 5000 
      });
      return output.includes('preflight-status') || output.includes('enoteware.preflight');
    } catch {
      // Extension check is optional - return true if we can't check
      return true;
    }
  },
  'VS Code extension not installed (optional)',
  'Run: npx @enoteware/preflight install --with-extension'
);

// Check 7: Dashboard file exists
check(
  'Dashboard File',
  () => existsSync(join(process.cwd(), 'preflight-dashboard.html')),
  'Dashboard file not found',
  'Run: npx @enoteware/preflight setup'
);

// Run verification
console.log('🔍 Verifying Preflight Setup...\n');

const errors = results.filter(r => r.status === 'error');
const warnings = results.filter(r => r.status === 'warning');
const ok = results.filter(r => r.status === 'ok');

// Print results
for (const result of results) {
  const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} ${result.name}: ${result.message}`);
  if (result.fix) {
    console.log(`   Fix: ${result.fix}`);
  }
}

console.log('\n' + '='.repeat(50) + '\n');

if (errors.length > 0) {
  console.log(`❌ Found ${errors.length} error(s)`);
  console.log(`⚠️  Found ${warnings.length} warning(s)`);
  console.log(`✅ ${ok.length} check(s) passed\n`);
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`⚠️  Found ${warnings.length} warning(s)`);
  console.log(`✅ ${ok.length} check(s) passed\n`);
  process.exit(0);
} else {
  console.log(`✅ All checks passed! Preflight is properly set up.\n`);
  process.exit(0);
}
