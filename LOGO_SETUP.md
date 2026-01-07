# Quick Start: Service Logos

This guide gets you up and running with service logos in the Preflight dashboard in under 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Preflight dashboard set up (`preflight-dashboard.html` exists)

## Steps

### 1. Get Brandfetch API Key (2 minutes)

1. Go to https://www.brandfetch.com/api
2. Sign up (free plan available)
3. Copy your API key

### 2. Configure Environment (30 seconds)

Create or edit `.env.local` in your project root:

```bash
BRANDFETCH_API_KEY=your_api_key_here
```

### 3. Download Logos (1 minute)

Run the download script:

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

### 4. Start Dashboard (30 seconds)

```bash
npx tsx scripts/serve-dashboard.ts
```

### 5. View Logos (30 seconds)

Open http://localhost:8080 in your browser.

Service checks now display with branded logos! 🎉

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

## Supported Services

Logos are automatically downloaded for:
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

### "BRANDFETCH_API_KEY not set"

Make sure `.env.local` exists in your project root with:
```bash
BRANDFETCH_API_KEY=your_actual_key
```

### "No brand found for [service]"

Some services may not be in Brandfetch's database. The dashboard will work fine without their logos.

### Logos don't appear in dashboard

Make sure you're:
1. Running the dashboard server (`npx tsx scripts/serve-dashboard.ts`)
2. NOT opening the HTML file directly (logos need the server to load)

## Next Steps

- See [docs/LOGOS.md](docs/LOGOS.md) for full documentation
- Add custom logos manually if needed
- Customize logo display in `preflight-dashboard.html`

## Need Help?

Open an issue: https://github.com/enoteware/preflight/issues
