/**
 * Check Runner - Executes preflight checks
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { CheckData, StatusSummary } from './types';

const execAsync = promisify(exec);

export interface PreflightResults {
  checks: CheckData[];
  services: CheckData[];
  summary: StatusSummary;
}

/**
 * Find environment variable in configured env files
 */
function findEnvVarInFiles(
  workspacePath: string,
  varName: string,
  envFiles: string[]
): { filePath: string; lineNumber: number } | undefined {
  for (const envFile of envFiles) {
    const fullPath = join(workspacePath, envFile);
    if (!existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match VAR_NAME= or VAR_NAME = or export VAR_NAME=
        if (line.match(new RegExp(`^(export\\s+)?${varName}\\s*=`, 'i'))) {
          return { filePath: envFile, lineNumber: i + 1 };
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }
  return undefined;
}

/**
 * Check if a check should be categorized based on overrides
 */
function applyCategoryOverride(
  message: string,
  defaultIsService: boolean,
  overrides: Record<string, string>
): boolean {
  for (const [pattern, category] of Object.entries(overrides)) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(message)) {
        return category.toLowerCase() === 'service';
      }
    } catch {
      // Invalid regex, skip
    }
  }
  return defaultIsService;
}

export async function runPreflightChecks(): Promise<PreflightResults> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    throw new Error('No workspace folder open');
  }

  const config = vscode.workspace.getConfiguration('preflight');
  const quickMode = config.get<boolean>('quickMode', true);
  const categoryOverrides = config.get<Record<string, string>>('categoryOverrides', {});
  const envFiles = config.get<string[]>('envFiles', ['.env.local', '.env', '.env.development']);

  // Run preflight check script with JSON output
  const scriptPath = join(workspaceFolder.uri.fsPath, 'scripts', 'preflight-check.ts');
  
  // Check if script exists
  if (!existsSync(scriptPath)) {
    return {
      checks: [
        {
          status: 'warning',
          message: 'Preflight scripts not found',
          details: `Expected preflight check script at: scripts/preflight-check.ts\n\nRun 'npx @enoteware/preflight setup' to set up preflight checks in this workspace.`,
          helpUrl: 'https://github.com/enoteware/preflight',
          timestamp: Date.now(),
        },
      ],
      services: [],
      summary: { total: 1, ok: 0, warnings: 1, errors: 0 },
    };
  }

  // Check if tsx is available (try npx tsx --version first)
  let tsxAvailable = false;
  try {
    await execAsync('npx tsx --version', { 
      cwd: workspaceFolder.uri.fsPath,
      timeout: 5000,
    });
    tsxAvailable = true;
  } catch {
    // tsx not available - will show helpful error below
  }

  const command = `npx tsx "${scriptPath}" --json ${quickMode ? '--quick' : ''}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceFolder.uri.fsPath,
      timeout: 30000, // 30 second timeout
    });

    if (stderr && !stderr.includes('warning')) {
      console.warn('Preflight check stderr:', stderr);
    }

    // Check if stdout is empty or invalid JSON
    if (!stdout || stdout.trim().length === 0) {
      throw new Error('Preflight check returned no output');
    }

    // Parse JSON output
    let data;
    try {
      data = JSON.parse(stdout);
    } catch (parseError) {
      throw new Error(`Failed to parse preflight output: ${parseError instanceof Error ? parseError.message : String(parseError)}\nOutput: ${stdout.substring(0, 200)}`);
    }

    // Categorize results
    const checks: CheckData[] = [];
    const services: CheckData[] = [];

    let total = 0;
    let ok = 0;
    let warnings = 0;
    let errors = 0;

    for (const summary of data.summaries || []) {
      // Categorize: Service Connections go to services view,
      // everything else (CLI Tools, Configuration, Environment Variables) goes to checks view
      let isService = summary.category.toLowerCase().includes('service') ||
        summary.category.toLowerCase().includes('connection');

      for (const result of summary.results || []) {
        // Try to find env var location
        let envFilePath: string | undefined;
        let envLineNumber: number | undefined;
        
        // Extract env var name from message (common patterns)
        const envVarMatch = result.message.match(/([A-Z_][A-Z0-9_]*)/);
        if (envVarMatch) {
          const varName = envVarMatch[1];
          const location = findEnvVarInFiles(workspaceFolder.uri.fsPath, varName, envFiles);
          if (location) {
            envFilePath = location.filePath;
            envLineNumber = location.lineNumber;
          }
        }

        // Apply category override if configured
        const finalIsService = applyCategoryOverride(result.message, isService, categoryOverrides);

        const checkData: CheckData = {
          status: result.status,
          message: result.message,
          details: result.details,
          latency: result.latency,
          helpUrl: result.helpUrl,
          timestamp: Date.now(),
          envFilePath,
          envLineNumber,
        };

        if (finalIsService) {
          services.push(checkData);
        } else {
          checks.push(checkData);
        }

        total++;
        if (result.status === 'ok') ok++;
        else if (result.status === 'warning') warnings++;
        else if (result.status === 'error') errors++;
      }
    }

    return {
      checks,
      services,
      summary: { total, ok, warnings, errors },
    };
  } catch (error) {
    console.error('Error running preflight checks:', error);

    // Extract more helpful error message
    let errorMessage = error instanceof Error ? error.message : String(error);
    let actionableSteps: string[] = [];
    
    // Check for common error patterns and provide actionable fixes
    if (!tsxAvailable || errorMessage.includes('tsx') || errorMessage.includes('command not found')) {
      errorMessage = `Preflight requires 'tsx' to run TypeScript files, but it's not available.`;
      actionableSteps = [
        'Install tsx globally: npm install -g tsx',
        'Or install locally: npm install --save-dev tsx',
        'Then try running the check again',
      ];
    } else if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      if (errorMessage.includes('preflight-check.ts')) {
        errorMessage = `Preflight script not found at: scripts/preflight-check.ts`;
        actionableSteps = [
          'Run setup: npx @enoteware/preflight setup',
          'Or manually create scripts/preflight-check.ts',
        ];
      } else {
        errorMessage = `Required file not found: ${errorMessage}`;
        actionableSteps = [
          'Check that all preflight files are in place',
          'Run: npx @enoteware/preflight setup to regenerate',
        ];
      }
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Preflight check timed out after 30 seconds.';
      actionableSteps = [
        'Some checks may be slow (network requests, git fetch)',
        'Try enabling quick mode in settings (skips slow checks)',
        'Or check your network connection',
      ];
    } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
      errorMessage = 'Failed to parse preflight check output.';
      actionableSteps = [
        'The check script may have errors',
        'Try running manually: npx tsx scripts/preflight-check.ts',
        'Check the Output panel for detailed error messages',
      ];
    } else {
      actionableSteps = [
        'Check the Output panel (View → Output → Extension Host) for details',
        'Try running manually: npx tsx scripts/preflight-check.ts',
      ];
    }

    const fullErrorMessage = actionableSteps.length > 0
      ? `${errorMessage}\n\nQuick Fix:\n${actionableSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : errorMessage;

    // Return error result
    return {
      checks: [
        {
          status: 'error',
          message: 'Failed to run preflight checks',
          details: fullErrorMessage,
          helpUrl: 'https://github.com/enoteware/preflight',
          timestamp: Date.now(),
        },
      ],
      services: [],
      summary: { total: 1, ok: 0, warnings: 0, errors: 1 },
    };
  }
}
