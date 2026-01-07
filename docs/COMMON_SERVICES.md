# Common Service Check Examples

This guide shows how to add service connectivity checks for common services. These examples follow the v1.1.0 pattern where service checks skip if env vars are missing (configuration is checked separately).

## ⚠️ Critical: Always Verify Keys Work

**IMPORTANT**: Service checks must make **REAL API calls** to verify your keys are working, not just that they're set.

- ✅ **Configuration check**: "Is `GITHUB_TOKEN` set?" (instant, no network)
- ✅ **Service check**: "Does `GITHUB_TOKEN` work?" (makes API call, verifies 200 OK)

A service check should:
1. Check if env var exists (skip if missing)
2. **Make an authenticated API call** using the key
3. **Verify `response.ok` (200-299)** to confirm key is valid
4. Return error if 401 (invalid/expired key) or other failures

This ensures your API keys are **actually working**, not just configured.

## Documentation Resources

For detailed setup guides, API references, and CLI documentation for these services, see [SERVICE_RESOURCES.md](SERVICE_RESOURCES.md).

**Quick Reference:**

| Service | Documentation | Setup Guide | API Reference |
|---------|--------------|-------------|---------------|
| Supabase | [docs](https://supabase.com/docs) | [Quickstart](https://supabase.com/docs/guides/getting-started) | [API Reference](https://supabase.com/docs/reference/javascript/introduction) |
| Resend | [docs](https://resend.com/docs) | [Node.js Setup](https://resend.com/docs/send-with-nodejs) | [API Reference](https://resend.com/docs/api-reference) |
| Vercel API | [docs](https://vercel.com/docs/rest-api) | [Authentication](https://vercel.com/docs/rest-api/authentication) | [API Reference](https://vercel.com/docs/rest-api) |
| Klaviyo | [docs](https://developers.klaviyo.com) | [Developer Guide](https://developers.klaviyo.com/en/docs/developer-guide) | [API Reference](https://developers.klaviyo.com/en/reference/api-overview) |
| Redis/Upstash | [docs](https://upstash.com/docs) | [Getting Started](https://upstash.com/docs/redis/overall/getstarted) | [REST API](https://upstash.com/docs/redis/features/restapi) |
| YouTube API | [docs](https://developers.google.com/youtube/v3) | [Getting Started](https://developers.google.com/youtube/v3/getting-started) | [API Reference](https://developers.google.com/youtube/v3/docs) |

## Pattern

All service checks follow this pattern:

```typescript
export async function checkServiceName(): Promise<CheckResult> {
  const apiKey = process.env.SERVICE_API_KEY;
  const startTime = Date.now();

  // Skip if env var not set (that's a configuration issue, not connectivity)
  if (!apiKey) {
    return {
      status: 'warning',
      message: 'Service Name: Not checked (SERVICE_API_KEY not set)',
      details: 'Set SERVICE_API_KEY environment variable to enable this check',
      helpUrl: 'https://service.com/docs',
    };
  }

  try {
    // ⚠️ CRITICAL: Make REAL API call to verify the key works
    // This endpoint should require authentication - if we get 200, the key is valid
    const response = await fetch('https://api.service.com/endpoint', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    // 200 OK = Key is valid and working!
    if (response.ok) {
      return {
        status: 'ok',
        message: 'Service Name: 200 OK',
        details: `✅ Key verified - Connected successfully (${latency}ms)`,
        latency,
        helpUrl: 'https://service.com/docs',
      };
    } else if (response.status === 401) {
      // 401 = Key is invalid, expired, or revoked
      return {
        status: 'error',
        message: 'Service Name: Authentication failed',
        details: `❌ Key is invalid or expired (HTTP ${response.status}, ${latency}ms)`,
        latency,
        helpUrl: 'https://service.com/api-keys',
      };
    } else {
      return {
        status: 'warning',
        message: `Service Name: Status ${response.status}`,
        details: `${response.statusText} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        status: 'error',
        message: 'Service Name: Timeout',
        details: 'Request timed out after 5s',
        latency,
      };
    }
    return {
      status: 'error',
      message: 'Service Name: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
```

## Common Services

### Supabase

📚 **Documentation**: [Setup Guide](https://supabase.com/docs/guides/getting-started) | [API Reference](https://supabase.com/docs/reference/javascript/introduction) | [Full Docs](https://supabase.com/docs)

```typescript
export async function checkSupabase(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const startTime = Date.now();

  if (!url || !anonKey) {
    return {
      status: 'warning',
      message: 'Supabase: Not checked (keys not set)',
      details: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
      helpUrl: 'https://supabase.com/docs',
    };
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Supabase: 200 OK',
        details: `Connected to ${url} (${latency}ms)`,
        latency,
      };
    } else {
      return {
        status: 'error',
        message: 'Supabase: Connection failed',
        details: `HTTP ${response.status} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'Supabase: Unreachable',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
```

### Resend (Email)

📚 **Documentation**: [Setup Guide](https://resend.com/docs/send-with-nodejs) | [API Reference](https://resend.com/docs/api-reference) | [Full Docs](https://resend.com/docs)

```typescript
export async function checkResend(): Promise<CheckResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const startTime = Date.now();

  if (!apiKey) {
    return {
      status: 'warning',
      message: 'Resend: Not checked (RESEND_API_KEY not set)',
      details: 'Set RESEND_API_KEY environment variable',
      helpUrl: 'https://resend.com/api-keys',
    };
  }

  if (!apiKey.startsWith('re_')) {
    return {
      status: 'error',
      message: 'Resend: Invalid API key format',
      details: 'Resend API keys should start with "re_"',
      helpUrl: 'https://resend.com/api-keys',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    // 401 might be a restricted key (valid but can only send, not read)
    if (response.status === 401) {
      try {
        const errorData = await response.json();
        if (errorData.name === 'restricted_api_key') {
          return {
            status: 'ok',
            message: 'Resend: 401 OK',
            details: `API key valid (restricted to sending only) (${latency}ms)`,
            latency,
          };
        }
      } catch {
        // Fall through to error
      }
    }

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Resend: 200 OK',
        details: `Email service active (${latency}ms)`,
        latency,
      };
    } else {
      return {
        status: 'error',
        message: 'Resend: Authentication failed',
        details: `HTTP ${response.status} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'Resend: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
```

### Vercel API

📚 **Documentation**: [Setup Guide](https://vercel.com/docs/rest-api/authentication) | [API Reference](https://vercel.com/docs/rest-api) | [CLI Docs](https://vercel.com/docs/cli)

```typescript
export async function checkVercelAPI(): Promise<CheckResult> {
  const token = process.env.VERCEL_ACCESS_TOKEN || process.env.VERCEL_TOKEN;
  const startTime = Date.now();

  if (!token) {
    return {
      status: 'warning',
      message: 'Vercel API: Not checked (token not set)',
      details: 'Set VERCEL_ACCESS_TOKEN or VERCEL_TOKEN',
      helpUrl: 'https://vercel.com/account/tokens',
    };
  }

  try {
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'ok',
        message: 'Vercel API: 200 OK',
        details: `Authenticated as ${data.user?.username || 'user'} (${latency}ms)`,
        latency,
      };
    } else if (response.status === 401) {
      return {
        status: 'error',
        message: 'Vercel API: Authentication failed',
        details: `Invalid or expired token (${latency}ms)`,
        latency,
        helpUrl: 'https://vercel.com/account/tokens',
      };
    } else {
      return {
        status: 'warning',
        message: `Vercel API: Status ${response.status}`,
        details: `${response.statusText} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'Vercel API: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
```

### Klaviyo

📚 **Documentation**: [Setup Guide](https://developers.klaviyo.com/en/docs/developer-guide) | [API Reference](https://developers.klaviyo.com/en/reference/api-overview) | [Full Docs](https://developers.klaviyo.com)

```typescript
export async function checkKlaviyo(): Promise<CheckResult> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  const startTime = Date.now();

  if (!apiKey) {
    return {
      status: 'warning',
      message: 'Klaviyo: Not checked (KLAVIYO_API_KEY not set)',
      details: 'Set KLAVIYO_API_KEY environment variable',
      helpUrl: 'https://developers.klaviyo.com',
    };
  }

  try {
    const response = await fetch('https://a.klaviyo.com/api/accounts/', {
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-10-15',
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Klaviyo: 200 OK',
        details: `Marketing email service active (${latency}ms)`,
        latency,
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        status: 'error',
        message: 'Klaviyo: Authentication failed',
        details: `Invalid API key (HTTP ${response.status}, ${latency}ms)`,
        latency,
      };
    } else {
      return {
        status: 'warning',
        message: `Klaviyo: Status ${response.status}`,
        details: `${response.statusText} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'Klaviyo: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
```

### Redis/Upstash

📚 **Documentation**: [Setup Guide](https://upstash.com/docs/redis/overall/getstarted) | [REST API](https://upstash.com/docs/redis/features/restapi) | [Full Docs](https://upstash.com/docs)

```typescript
export async function checkRedis(): Promise<CheckResult> {
  const redisUrl = process.env.REDIS_URL;
  const redisToken = process.env.REDIS_TOKEN;
  const startTime = Date.now();

  if (!redisUrl || !redisToken) {
    return {
      status: 'warning',
      message: 'Redis: Not checked (keys not set)',
      details: 'Set REDIS_URL and REDIS_TOKEN (optional caching service)',
      helpUrl: 'https://upstash.com/docs',
    };
  }

  try {
    const response = await fetch(`${redisUrl}/ping`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Redis: 200 OK',
        details: `Caching service active (${latency}ms)`,
        latency,
      };
    } else {
      return {
        status: 'warning',
        message: 'Redis: Connection failed',
        details: `Status ${response.status} - Caching disabled (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'warning',
      message: 'Redis: Unreachable',
      details: `Caching disabled - ${error instanceof Error ? error.message : String(error)} (${latency}ms)`,
      latency,
    };
  }
}
```

### YouTube API

📚 **Documentation**: [Setup Guide](https://developers.google.com/youtube/v3/getting-started) | [API Reference](https://developers.google.com/youtube/v3/docs) | [Full Docs](https://developers.google.com/youtube/v3)

```typescript
export async function checkYouTubeAPI(): Promise<CheckResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  const startTime = Date.now();

  if (!apiKey) {
    return {
      status: 'warning',
      message: 'YouTube API: Not checked (YOUTUBE_API_KEY not set)',
      details: 'Optional - YouTube data service disabled',
      helpUrl: 'https://developers.google.com/youtube/v3',
    };
  }

  try {
    const url = channelId
      ? `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`
      : `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&key=${apiKey}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      const channelName = channelId && data.items?.[0]?.snippet?.title;
      return {
        status: 'ok',
        message: 'YouTube API: 200 OK',
        details: channelName ? `Channel: ${channelName} (${latency}ms)` : `Connected (${latency}ms)`,
        latency,
      };
    } else if (response.status === 403) {
      return {
        status: 'error',
        message: 'YouTube API: Quota exceeded or invalid key',
        details: `HTTP ${response.status} (${latency}ms)`,
        latency,
        helpUrl: 'https://developers.google.com/youtube/v3/getting-started',
      };
    } else {
      return {
        status: 'error',
        message: 'YouTube API: Request failed',
        details: `HTTP ${response.status} (${latency}ms)`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: 'error',
      message: 'YouTube API: Connection failed',
      details: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
```

## Adding to Your Project

1. **Add the function** to `scripts/preflight-validators/services.ts`
2. **Import and call it** in `scripts/preflight-check.ts`:

```typescript
import { checkSupabase, checkResend } from './preflight-validators/services';

// In runChecks():
const serviceResults: CheckResult[] = [];
// ... existing checks ...
const supabaseResult = await checkSupabase();
serviceResults.push(supabaseResult);
const resendResult = await checkResend();
serviceResults.push(resendResult);
```

3. **Add env var validation** to `scripts/preflight-validators/env.ts`:

```typescript
{
  key: 'NEXT_PUBLIC_SUPABASE_URL',
  required: true,
  validator: (v) => v.startsWith('https://') && v.includes('supabase.co'),
  format: 'https://[project-id].supabase.co',
  helpUrl: 'https://supabase.com/docs',
  description: 'Supabase project URL',
},
```

## Best Practices

1. **Always check for env var first** - Return "Not checked" if missing
2. **Make REAL API calls** - Don't just check if key exists, verify it works with a 200 response
3. **Verify 200 OK** - `response.ok` confirms the key is valid and working
4. **Handle 401 errors** - Invalid/expired keys should return error status
5. **Include latency** - Helps monitor performance
6. **Handle timeouts** - Use `AbortSignal.timeout(5000)`
7. **Provide help URLs** - Makes it easy to fix issues
8. **Differentiate error types** - 401 (auth) vs 500 (server) vs timeout
9. **Handle edge cases** - Restricted keys, rate limits, etc.

## Testing Your Service Checks

After adding a service check, verify it works:

```bash
# Run preflight check
npm run preflight

# You should see:
# ✅ Service Name: 200 OK
#    ✅ Key verified - Connected successfully (123ms)
```

If you see:
- ❌ "Authentication failed" → Your key is invalid/expired
- ❌ "Not checked" → Key not set (add to .env.local)
- ✅ "200 OK" → Key is valid and working!

## Need More Examples?

Check the [Preflight repository](https://github.com/enoteware/preflight) for more service check examples, or open an issue to request a specific service.
