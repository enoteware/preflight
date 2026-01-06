# Instructions for AI Agents

When helping users with Preflight Toolkit, follow these guidelines for interpreting check results and providing fixes.

## Understanding Check Results

### Configuration Checks
**Category**: "Configuration"  
**Purpose**: Verify environment variables are SET (instant, no network calls)

**Status Meanings:**
- ✅ `ok`: Environment variable is set and valid
- ⚠️ `warning`: Environment variable is optional and not set
- ❌ `error`: Required environment variable is missing or invalid format

**What to Fix:**
- **Missing required var**: Add to `.env.local` file
- **Invalid format**: Check the expected format (shown in details) and update the value
- **Optional var not set**: Inform user it's optional, but recommended for full functionality

### Service Connection Checks
**Category**: "Service Connections"  
**Purpose**: Verify API keys WORK by making real authenticated API calls

**Status Meanings:**
- ✅ `ok` with "200 OK": Key is valid and working (authenticated successfully)
- ❌ `error` with "Authentication failed" or "401": Key is invalid, expired, or revoked
- ❌ `error` with "Timeout": Service unreachable or network issue
- ❌ `error` with "Connection failed": Network error or service down
- ⚠️ `warning` with "Not checked": Environment variable not set (configuration issue)

**What to Fix:**

#### 401 Authentication Failed
```
❌ GitHub API: Authentication failed
   ❌ Key is invalid or expired (HTTP 401, 123ms)
```

**Actions:**
1. Check if key exists in `.env.local`
2. Verify key format is correct (e.g., GitHub tokens should be `ghp_...` or `github_pat_...`)
3. Test key manually or regenerate it
4. Check if key has required permissions/scopes
5. Verify key hasn't expired (some services have expiration)

**Example Fix:**
```bash
# 1. Check if key is in .env.local
cat .env.local | grep GITHUB_TOKEN

# 2. If missing or invalid, get a new token:
# - Go to https://github.com/settings/tokens
# - Generate new token with required scopes
# - Add to .env.local: GITHUB_TOKEN=ghp_your_token_here

# 3. Test the key works:
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
```

#### Timeout Errors
```
❌ GitHub API: Timeout
   Request timed out after 5s
```

**Actions:**
1. Check internet connectivity
2. Check if service is down (status page)
3. Check firewall/proxy settings
4. Try increasing timeout (if service is slow)
5. Check if behind VPN that might be blocking

**Example Fix:**
```bash
# 1. Test internet connectivity
curl https://api.github.com

# 2. Check if service is up
curl https://www.githubstatus.com/api/v2/status.json

# 3. If behind corporate firewall, may need to configure proxy
```

#### Connection Failed
```
❌ GitHub API: Connection failed
   getaddrinfo ENOTFOUND api.github.com
```

**Actions:**
1. Check DNS resolution
2. Check network connectivity
3. Verify service URL is correct
4. Check for typos in service endpoint

#### "Not Checked" Warning
```
⚠️ GitHub API: Not checked (GITHUB_TOKEN not set)
   Set GITHUB_TOKEN environment variable to enable this check
```

**Actions:**
1. This is a configuration issue, not a connectivity issue
2. Add the environment variable to `.env.local`
3. Run preflight check again

**Example Fix:**
```bash
# Add to .env.local
echo "GITHUB_TOKEN=your_token_here" >> .env.local

# Verify it's loaded
npm run preflight
```

## Common Service-Specific Issues

### GitHub API
- **401 Error**: Token expired or revoked
  - Fix: Generate new token at https://github.com/settings/tokens
  - Required scopes: `read:user` (minimum)
- **403 Error**: Token lacks required permissions
  - Fix: Regenerate token with correct scopes

### Supabase
- **401 Error**: Invalid anon key or service key
  - Fix: Get keys from Supabase dashboard → Settings → API
- **Connection failed**: Check project URL format
  - Fix: Should be `https://[project-id].supabase.co`

### Vercel API
- **401 Error**: Token expired
  - Fix: Get new token from https://vercel.com/account/tokens
- **Token not found**: Check env var name
  - Fix: Use `VERCEL_ACCESS_TOKEN` or `VERCEL_TOKEN`

### Resend
- **401 Error**: Invalid API key
  - Fix: Get new key from https://resend.com/api-keys
  - Format: Should start with `re_`
- **Restricted key**: Some keys can only send, not read
  - This is OK - restricted keys still work for sending emails

### OpenAI
- **401 Error**: Invalid API key
  - Fix: Get new key from https://platform.openai.com/api-keys
- **429 Error**: Rate limit exceeded
  - Fix: Wait or upgrade plan

## Diagnostic Commands

When troubleshooting, use these commands:

```bash
# 1. Check if env vars are loaded
npm run preflight

# 2. Check specific service (if custom check exists)
npx tsx scripts/preflight-validators/services.ts

# 3. Test API key manually (example for GitHub)
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user

# 4. Check if .env.local exists and has the key
cat .env.local | grep -i "SERVICE_NAME"

# 5. Verify dotenv is loading correctly
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.SERVICE_KEY ? 'Loaded' : 'Missing')"
```

## Step-by-Step Troubleshooting Flow

1. **Identify the issue type:**
   - Configuration (env var not set) → Add to `.env.local`
   - Authentication (401) → Key invalid/expired → Regenerate key
   - Network (timeout/connection failed) → Check connectivity/service status

2. **Check the details:**
   - Read the `details` field in the check result
   - Look for HTTP status codes (401, 403, 500, etc.)
   - Check latency (high latency might indicate network issues)

3. **Provide specific fix:**
   - Don't just say "fix the key" - provide exact steps
   - Include the service's documentation URL
   - Show example commands to test the fix

4. **Verify the fix:**
   - Have user run `npm run preflight` again
   - Check that status changed from `error` to `ok`

## Example Agent Response Template

When a service check fails, respond like this:

```
The GitHub API check is failing with a 401 authentication error. This means your GITHUB_TOKEN is invalid, expired, or revoked.

**To fix:**

1. **Get a new token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select required scopes (at minimum: `read:user`)
   - Copy the token

2. **Add to .env.local:**
   ```bash
   echo "GITHUB_TOKEN=ghp_your_new_token_here" >> .env.local
   ```

3. **Test it works:**
   ```bash
   curl -H "Authorization: Bearer $(grep GITHUB_TOKEN .env.local | cut -d= -f2)" https://api.github.com/user
   ```

4. **Re-run preflight:**
   ```bash
   npm run preflight
   ```

You should now see: ✅ GitHub API: 200 OK
```

## Quick Reference: Status → Action

| Status | Message Contains | Action |
|--------|-----------------|--------|
| `error` | "Authentication failed" / "401" | Regenerate API key |
| `error` | "Invalid" / "expired" | Regenerate API key |
| `error` | "Timeout" | Check network/service status |
| `error` | "Connection failed" | Check DNS/network |
| `warning` | "Not checked" / "not set" | Add env var to `.env.local` |
| `warning` | "Status 403" | Check key permissions |
| `ok` | "200 OK" | ✅ Working correctly |

## Important Notes for Agents

1. **Always verify keys work, not just that they're set**
   - Configuration checks verify keys are SET
   - Service checks verify keys WORK (200 OK)

2. **Provide actionable steps, not just descriptions**
   - Include exact commands to run
   - Link to service documentation
   - Show example values (when safe)

3. **Check both configuration AND service status**
   - If config check passes but service check fails → Key is set but invalid
   - If config check fails → Key not set (add to `.env.local`)

4. **Use the help URLs provided**
   - Each check result includes a `helpUrl` field
   - Direct users to these for service-specific documentation

5. **Test fixes before declaring success**
   - Have user run `npm run preflight` again
   - Verify status changed to `ok`

## Common Mistakes to Avoid

❌ **Don't say**: "Your API key is wrong"  
✅ **Do say**: "Your API key appears to be invalid or expired. Here's how to get a new one..."

❌ **Don't say**: "Fix the connection"  
✅ **Do say**: "The service check is timing out. Let's verify your network connection and check if the service is up..."

❌ **Don't say**: "Add the key"  
✅ **Do say**: "Add `SERVICE_KEY=your_key_here` to your `.env.local` file, then run `npm run preflight` again"

## Additional Resources

- [Common Service Check Examples](COMMON_SERVICES.md) - Copy-paste examples for popular services
- [Migration Guide](MIGRATION.md) - For updating existing installations
- [Main README](../README.md) - Setup and usage instructions
