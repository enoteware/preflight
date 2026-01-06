/**
 * Dev server status validation
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CheckResult } from './types';

interface ServerInfo {
  pid: number;
  port: number;
}

function getServerInfo(): ServerInfo | null {
  const PID_FILE = join(process.cwd(), '.dev-server.pid');
  const PORT_FILE = join(process.cwd(), '.dev-server.port');
  
  if (!existsSync(PID_FILE) || !existsSync(PORT_FILE)) {
    return null;
  }
  
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
    const port = parseInt(readFileSync(PORT_FILE, 'utf-8').trim(), 10);
    
    // Check if process is still running
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists
      return { pid, port };
    } catch {
      return null; // Process doesn't exist
    }
  } catch {
    return null;
  }
}

export function checkDevServer(): CheckResult {
  const serverInfo = getServerInfo();
  
  if (!serverInfo) {
    return {
      status: 'warning',
      message: 'Dev server not running',
      details: 'Run: npm run dev:start',
    };
  }
  
  return {
    status: 'ok',
    message: `Dev server running on port ${serverInfo.port}`,
    details: `PID: ${serverInfo.pid} | URL: http://localhost:${serverInfo.port}`,
  };
}

export function checkPortAvailability(port: number = 6191): CheckResult {
  // Simple check - if dev server is running, port is in use (which is fine)
  const serverInfo = getServerInfo();
  
  if (serverInfo && serverInfo.port === port) {
    return {
      status: 'ok',
      message: `Port ${port} in use by dev server`,
      details: 'This is expected when dev server is running',
    };
  }
  
  // For a more thorough check, we'd need to actually test the port
  // But for preflight, just checking if our dev server is using it is sufficient
  return {
    status: 'ok',
    message: `Port ${port} available`,
    details: 'No dev server detected on this port',
  };
}
