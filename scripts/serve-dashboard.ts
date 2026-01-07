#!/usr/bin/env tsx
/**
 * Simple HTTP server for preflight dashboard
 * 
 * Usage: npx tsx scripts/serve-dashboard.ts
 * Or: npm run preflight:dashboard
 */

import { createServer, Server } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEFAULT_PORT = 8080;
const ROOT = process.cwd();

interface RepoInfo {
  name: string;
  githubUrl?: string;
  description?: string;
  version?: string;
}

// Check if port is available by trying to create a server
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.listen(port, () => {
      testServer.close(() => {
        resolve(true); // Port is available
      });
    });
    testServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        resolve(false); // Other error, assume port is in use
      }
    });
  });
}

// Find available port starting from default
async function findAvailablePort(startPort: number = DEFAULT_PORT): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + 100}`);
}

// Get repository information
async function getRepoInfo(): Promise<RepoInfo> {
  const info: RepoInfo = {
    name: basename(ROOT),
  };

  // Try to get info from package.json
  const packageJsonPath = join(ROOT, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.name) info.name = packageJson.name;
      if (packageJson.description) info.description = packageJson.description;
      if (packageJson.version) info.version = packageJson.version;
      if (packageJson.repository?.url) {
        // Extract GitHub URL from various formats
        const repoUrl = packageJson.repository.url;
        if (repoUrl.includes('github.com')) {
          info.githubUrl = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Try to get GitHub URL from git remote
  if (!info.githubUrl) {
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: ROOT });
      const remoteUrl = stdout.trim();
      if (remoteUrl.includes('github.com')) {
        // Convert SSH or HTTPS to HTTPS URL
        info.githubUrl = remoteUrl
          .replace(/^git@github.com:/, 'https://github.com/')
          .replace(/\.git$/, '');
      }
    } catch (error) {
      // Ignore errors - might not be a git repo
    }
  }

  return info;
}

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

// Get repo info once at startup
let repoInfo: RepoInfo;
let serverPort: number;

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  
  // Handle repo info endpoint
  if (url === '/repo-info.json') {
    try {
      const info = await getRepoInfo();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify({ ...info, port: serverPort }));
      return;
    } catch (error) {
      res.writeHead(500);
      res.end('Error getting repo info');
      return;
    }
  }
  
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
    let content = readFileSync(filePath, 'utf-8');
    
    // Inject repo info and port into dashboard HTML
    if (ext === '.html' && content.includes('<!-- REPO_INFO_PLACEHOLDER -->')) {
      const info = await getRepoInfo();
      const versionText = info.version ? ` v${info.version}` : '';
      const githubLink = info.githubUrl ? `<div style="font-size: 13px; color: #86868b; margin-bottom: 8px;">
            <strong style="color: #1d1d1f;">Repository:</strong> <a href="${info.githubUrl}" target="_blank" style="color: #007aff; text-decoration: none;">${info.githubUrl}</a>
          </div>` : '';
      const descriptionText = info.description ? `<div style="font-size: 13px; color: #86868b; margin-bottom: 8px;">
            ${info.description}
          </div>` : '';
      
      const githubLinkHtml = info.githubUrl 
        ? `<div class="repo-info-item"><strong>Repository:</strong> <a href="${info.githubUrl}" target="_blank">${info.githubUrl}</a></div>`
        : '';
      
      const infoHtml = [
        '<div class="repo-info">',
        `<div class="repo-info-item"><strong>Project:</strong> ${info.name}${versionText}</div>`,
        githubLinkHtml,
        `<div class="repo-info-item"><strong>Server:</strong> Port ${serverPort}</div>`,
        '</div>',
      ].join('\n');
      content = content.replace('<!-- REPO_INFO_PLACEHOLDER -->', infoHtml);
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500);
    res.end('Internal server error');
  }
});

// Start server on available port
async function startServer() {
  const requestedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  serverPort = await findAvailablePort(requestedPort);
  
  repoInfo = await getRepoInfo();
  
  server.listen(serverPort, () => {
    console.log(`\n🚀 Preflight Dashboard Server`);
    console.log(`   Project: ${repoInfo.name}${repoInfo.version ? ` v${repoInfo.version}` : ''}`);
    if (repoInfo.githubUrl) {
      console.log(`   Repository: ${repoInfo.githubUrl}`);
    }
    if (serverPort !== requestedPort) {
      console.log(`   ⚠️  Port ${requestedPort} was in use, using port ${serverPort} instead`);
    }
    console.log(`   URL: http://localhost:${serverPort}`);
    console.log(`   Dashboard: http://localhost:${serverPort}/preflight-dashboard.html`);
    console.log(`   Status API: http://localhost:${serverPort}/preflight-status.json`);
    console.log(`\n   Press Ctrl+C to stop\n`);
  });
  
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${serverPort} is already in use.`);
      console.error(`   Try setting a different port: PORT=8081 npx tsx scripts/serve-dashboard.ts\n`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
