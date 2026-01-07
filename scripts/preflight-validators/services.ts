import { CheckResult } from './types';

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
        'Authorization': `Bearer ${token}`,
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
        details: `✅ Key verified - Authenticated as: ${data.login || 'authenticated user'} (${latency}ms)`,
        latency,
        helpUrl: 'https://github.com/settings/tokens',
      };
    } else if (response.status === 401) {
      // 401 = Key is invalid, expired, or revoked
      return {
        status: 'error',
        message: 'GitHub API: Authentication failed',
        details: `❌ Key is invalid or expired (HTTP ${response.status}, ${latency}ms)`,
        latency,
        helpUrl: 'https://github.com/settings/tokens',
      };
    } else {
      return {
        status: 'warning',
        message: `GitHub API: Unexpected status ${response.status}`,
        details: `${response.statusText} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        status: 'error',
        message: 'GitHub API: Timeout',
        details: `Request timed out after 5s`,
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
        details: `httpbin.org is reachable (${latency}ms)`,
        latency,
        helpUrl: 'https://httpbin.org',
      };
    } else {
      return {
        status: 'warning',
        message: `Public API: Status ${response.status}`,
        details: `${response.statusText} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        status: 'error',
        message: 'Public API: Timeout',
        details: `Request timed out after 5s`,
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
//     headers: { 'Authorization': `Bearer ${apiKey}` },
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
