# Preflight Toolkit Migration Guide

If you set up Preflight before version 1.1.0, you'll need to update your configuration to use the new structure that separates **Configuration** checks from **Service Connections**.

## What Changed

### Before (v1.0)
- Environment variables and service checks were mixed together
- Service checks would show "warning" if env var was missing
- Hard to tell if issue was configuration or connectivity

### After (v1.1+)
- **Configuration** category: Checks if env vars are SET (instant, no network)
- **Service Connections** category: Checks if services are reachable (only if env var exists)
- Clear separation: "Missing key" vs "Service unreachable"

## Quick Migration

### Option 1: Automatic Update (Recommended)

Run the update script to automatically migrate your setup:

```bash
npx tsx src/setup.ts --update
```

Or if you have Preflight installed globally:

```bash
npx @enoteware/preflight update
```

### Option 2: Manual Update

If you prefer to update manually:

#### Step 1: Update `scripts/preflight-validators/services.ts`

**Old pattern:**
```typescript
export async function checkGitHubAPI(): Promise<CheckResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { status: 'warning', message: 'GitHub API key not configured' };
  }
  // ... rest of check
}
```

**New pattern:**
```typescript
export async function checkGitHubAPI(): Promise<CheckResult> {
  const token = process.env.GITHUB_TOKEN;
  
  // Skip if env var not set (that's a configuration issue, not connectivity)
  if (!token) {
    return {
      status: 'warning',
      message: 'GitHub API: Not checked (GITHUB_TOKEN not set)',
      details: 'Set GITHUB_TOKEN environment variable to enable this check',
      helpUrl: 'https://github.com/settings/tokens',
    };
  }
  
  // ... rest of connectivity check with improved error messages
}
```

**Key changes:**
- Service checks now return "Not checked (KEY not set)" when env var is missing
- Only make network calls if env var exists
- Include latency and HTTP status in messages

#### Step 2: Update `scripts/preflight-check.ts`

**Old:**
```typescript
// Environment Variables
const envResults = validateEnvVars();
summaries.push({ category: 'Environment Variables', results: envResults });

// Service Connections
const serviceResults: CheckResult[] = [];
// ...
summaries.push({ category: 'Service Connections', results: serviceResults });
```

**New:**
```typescript
// Configuration: Environment Variables
// These checks only verify if env vars are SET, not if services are reachable
const envResults = validateEnvVars();
summaries.push({ category: 'Configuration', results: envResults });

// Service Connections: Connectivity checks
// These verify services are reachable and responding (only if env vars are set)
const serviceResults: CheckResult[] = [];
// ...
summaries.push({ category: 'Service Connections', results: serviceResults });
```

**Key changes:**
- Changed "Environment Variables" category to "Configuration"
- Added comments explaining the separation

#### Step 3: Update Your Env Validator (Optional)

If you have custom env vars in `scripts/preflight-validators/env.ts`, they'll continue to work. The new structure just makes it clearer that these are configuration checks, not connectivity checks.

## What You'll See After Migration

### In the VS Code Extension

**Before:**
```
📦 Environment Checks
   ⚠️ GitHub API key not configured
```

**After:**
```
📦 Configuration
   ✅ GITHUB_TOKEN: Set

🌐 Service Connections
   ✅ GitHub API: 200 OK (142ms)
```

Or if key is missing:
```
📦 Configuration
   ❌ GITHUB_TOKEN: Required, missing

🌐 Service Connections
   ⚠️ GitHub API: Not checked (GITHUB_TOKEN not set)
```

### In the CLI Output

**Before:**
```
📦 Service Connections
   ⚠️ GitHub API key not configured
```

**After:**
```
📦 Configuration
   ❌ GITHUB_TOKEN: Required, missing

🌐 Service Connections
   ⚠️ GitHub API: Not checked (GITHUB_TOKEN not set)
```

## Benefits of the New Structure

1. **Faster feedback**: Configuration checks are instant (no network calls)
2. **Clearer errors**: Know immediately if it's "missing key" or "service down"
3. **Better performance**: Service checks only run when keys are configured
4. **Easier debugging**: Separate categories make it obvious what to fix

## Troubleshooting

### "Category 'Environment Variables' not showing"

The category name changed to "Configuration". Update your `preflight-check.ts` as shown in Step 2 above.

### "Service checks always show 'Not checked'"

Make sure your env vars are being loaded. Check that:
1. `.env.local` exists in your project root
2. `dotenv` is installed: `npm install dotenv`
3. The preflight script loads env vars before running checks

### "Extension shows old category names"

The extension automatically categorizes based on category name. If you see "Environment Variables" instead of "Configuration", update your `preflight-check.ts` category name.

## Need Help?

- Check the [main README](README.md) for setup instructions
- Open an issue: https://github.com/enoteware/preflight/issues
- Review the [changelog](CHANGELOG.md) for detailed changes
