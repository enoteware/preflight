/**
 * CLI tool validation (node, npm, vercel, etc.)
 */

import { execSync } from 'child_process';

import { CheckResult } from './types';

export interface CLICheck {
  name: string;
  command: string;
  versionFlag?: string;
  optional?: boolean;
}

const cliTools: CLICheck[] = [
  { name: 'node', command: 'node', versionFlag: '--version' },
  { name: 'npm', command: 'npm', versionFlag: '--version' },
  { name: 'vercel', command: 'vercel', versionFlag: '--version', optional: true },
  { name: 'psql', command: 'psql', versionFlag: '--version', optional: true },
];

export function checkCLITools(): CheckResult[] {
  const results: CheckResult[] = [];

  for (const tool of cliTools) {
    const result: CheckResult = {
      status: 'ok',
      message: tool.name,
    };

    try {
      const versionFlag = tool.versionFlag || '--version';
      const output = execSync(`${tool.command} ${versionFlag}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 5000,
      });
      const version = output.trim().split('\n')[0];
      result.message = `${tool.name} ${version}`;
    } catch (error) {
      if (tool.optional) {
        result.status = 'warning';
        result.message = `${tool.name} not found (optional)`;
      } else {
        result.status = 'error';
        result.message = `${tool.name} not found or not in PATH`;
        result.details = `Install ${tool.name} to continue`;
      }
    }

    results.push(result);
  }

  return results;
}
