import { execSync } from 'child_process';
import { CheckResult } from './types';

export function checkNode(): CheckResult {
  try {
    const version = execSync('node --version', { encoding: 'utf-8' }).trim();
    return {
      status: 'ok',
      message: `Node.js ${version}`,
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
      message: `${pm} ${version}`,
    };
  } catch {
    return {
      status: 'warning',
      message: `${pm} not found`,
    };
  }
}
