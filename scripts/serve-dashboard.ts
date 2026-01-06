#!/usr/bin/env tsx
/**
 * Simple HTTP server for preflight dashboard
 * 
 * Usage: npx tsx scripts/serve-dashboard.ts
 * Or: npm run preflight:dashboard
 */

import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORT = process.env.PORT || 8080;
const ROOT = process.cwd();

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Generate status JSON by running preflight check
async function generateStatusJson(): Promise<string> {
  const scriptPath = join(ROOT, 'scripts', 'preflight-check.ts');
  
  if (!existsSync(scriptPath)) {
    return JSON.stringify({
      summaries: [{
        category: 'Error',
        results: [{
          status: 'error',
          message: 'Preflight script not found',
          details: 'Make sure scripts/preflight-check.ts exists',
        }],
      }],
    });
  }

  try {
    const { stdout } = await execAsync(`npx tsx "${scriptPath}" --json`, {
      cwd: ROOT,
      timeout: 30000,
    });
    return stdout;
  } catch (error) {
    return JSON.stringify({
      summaries: [{
        category: 'Error',
        results: [{
          status: 'error',
          message: 'Failed to run preflight checks',
          details: error instanceof Error ? error.message : String(error),
        }],
      }],
    });
  }
}

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  
  // Handle status JSON endpoint
  if (url === '/preflight-status.json' || url === '/status.json') {
    try {
      const json = await generateStatusJson();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      });
      res.end(json);
      return;
    } catch (error) {
      res.writeHead(500);
      res.end('Error generating status');
      return;
    }
  }

  // Handle static files
  let filePath = join(ROOT, url === '/' ? 'preflight-dashboard.html' : url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Default to dashboard if file not found
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
  console.log(`\n🚀 Preflight Dashboard Server`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/preflight-dashboard.html`);
  console.log(`   Status API: http://localhost:${PORT}/preflight-status.json`);
  console.log(`\n   Press Ctrl+C to stop\n`);
});
