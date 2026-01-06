# Common Service Check Examples

This guide shows how to add service connectivity checks for common services. These examples follow the v1.1.0 pattern where service checks skip if env vars are missing (configuration is checked separately).

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
    // Make API call to verify connectivity
    const response = await fetch('https://api.service.com/endpoint', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        message: 'Service Name: 200 OK',
        details: `Connected successfully (${latency}ms)`,
        latency,
        helpUrl: 'https://service.com/docs',
      };
    } else if (response.status === 401) {
      return {
        status: 'error',
        message: 'Service Name: Authentication failed',
        details: `Invalid or expired token (HTTP ${response.status}, ${latency}ms)`,
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
2. **Include latency** - Helps monitor performance
3. **Handle timeouts** - Use `AbortSignal.timeout(5000)`
4. **Provide help URLs** - Makes it easy to fix issues
5. **Differentiate error types** - 401 (auth) vs 500 (server) vs timeout
6. **Handle edge cases** - Restricted keys, rate limits, etc.

## Need More Examples?

Check the [Preflight repository](https://github.com/enoteware/preflight) for more service check examples, or open an issue to request a specific service.
