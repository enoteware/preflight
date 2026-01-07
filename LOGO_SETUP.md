# Quick Start: Service Logos

Service logos are **already included** in the repository! No setup required.

## What You Get Out-of-the-Box

The Preflight dashboard includes pre-downloaded SVG logos for 13 popular services:
- ✅ GitHub
- ✅ Supabase
- ✅ Resend
- ✅ Vercel
- ✅ Klaviyo
- ✅ Upstash
- ✅ Redis
- ✅ Neon
- ✅ Clerk
- ✅ Stack Auth
- ✅ Auth0
- ✅ Stripe
- ✅ YouTube

## Quick Start (30 seconds)

### Start the Dashboard

```bash
npx tsx scripts/serve-dashboard.ts
```

Then open http://localhost:8080 - logos will display automatically! 🎉

## Updating Logos (Optional)

If you want to refresh logos or add new ones:

### Option 1: Download from Public CDN (Recommended)

```bash
npx tsx scripts/download-logos-public.ts
```

This uses free public CDN sources - no API key required!

### Option 2: Download from Brandfetch (Requires API Key)

1. Get API key from https://www.brandfetch.com/api
2. Add to `.env.local`:
   ```bash
   BRANDFETCH_API_KEY=your_api_key_here
   ```
3. Run:
   ```bash
   npx tsx scripts/download-logos.ts
   ```

You should see output like:

```
🎨 Downloading service logos from Brandfetch

═══════════════════════════════════════════

📥 Fetching logo for github (github.com)...
   🔗 Downloading from: https://...
   ✅ Saved to: extension/resources/logos/github.svg
   🎨 Primary color: #181717

📥 Fetching logo for supabase (supabase.com)...
   🔗 Downloading from: https://...
   ✅ Saved to: extension/resources/logos/supabase.svg
   🎨 Primary color: #3ECF8E

... (more services)

═══════════════════════════════════════════
✨ Logo download complete!

📁 Logos saved to: extension/resources/logos/
```


## What You Get

Before (no logos):
```
✅ GitHub API: 200 OK
   Logged in as: username
```

After (with logos):
```
✅ [GitHub Logo] GitHub API: 200 OK
   Logged in as: username
```

## Included Logos

Logos are included in the repo for:
- GitHub
- Supabase  
- Resend
- Vercel
- Klaviyo
- Upstash
- Redis
- Neon
- Clerk
- Stack Auth
- Auth0
- Stripe
- YouTube

## Troubleshooting

### Logos don't appear in dashboard

Make sure you're:
1. Running the dashboard server (`npx tsx scripts/serve-dashboard.ts`)
2. NOT opening the HTML file directly (logos need the server to load)
3. Checking the browser console for any 404 errors

### Want to add a custom logo?

Simply add your SVG file to `extension/resources/logos/[service-name].svg` and update the `SERVICE_LOGO_MAP` in `preflight-dashboard.html`

## Next Steps

- See [docs/LOGOS.md](docs/LOGOS.md) for full documentation
- Add custom logos manually if needed
- Customize logo display in `preflight-dashboard.html`

## Need Help?

Open an issue: https://github.com/enoteware/preflight/issues
