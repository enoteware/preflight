/**
 * Check Runner - Executes preflight checks
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import type { CheckData, StatusSummary } from './types';

const execAsync = promisify(exec);

export interface PreflightResults {
  checks: CheckData[];
  services: CheckData[];
  summary: StatusSummary;
}

export async function runPreflightChecks(): Promise<PreflightResults> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    throw new Error('No workspace folder open');
  }

  const config = vscode.workspace.getConfiguration('preflight');
  const quickMode = config.get<boolean>('quickMode', true);

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
      const isService = summary.category.toLowerCase().includes('service') ||
        summary.category.toLowerCase().includes('connection');

      for (const result of summary.results || []) {
        const checkData: CheckData = {
          status: result.status,
          message: result.message,
          details: result.details,
          latency: result.latency,
          helpUrl: result.helpUrl,
          timestamp: Date.now(),
        };

        if (isService) {
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
    
    // Check for common error patterns
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      errorMessage = `Preflight script not found. Make sure scripts/preflight-check.ts exists.\n\nRun 'npx @enoteware/preflight setup' to set up preflight checks.`;
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Preflight check timed out after 30 seconds. Some checks may be slow.';
    } else if (errorMessage.includes('tsx')) {
      errorMessage = `Failed to run preflight script. Make sure 'tsx' is available.\n\nInstall with: npm install -g tsx\n\nError: ${errorMessage}`;
    }

    // Return error result
    return {
      checks: [
        {
          status: 'error',
          message: 'Failed to run preflight checks',
          details: errorMessage,
          helpUrl: 'https://github.com/enoteware/preflight',
          timestamp: Date.now(),
        },
      ],
      services: [],
      summary: { total: 1, ok: 0, warnings: 0, errors: 1 },
    };
  }
}
