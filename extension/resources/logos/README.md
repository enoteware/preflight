# Service Logos

This directory contains SVG logos for various services displayed in the Preflight dashboard.

## Downloading Logos

Logos are downloaded from [Brandfetch](https://www.brandfetch.com/) using their API.

### Setup

1. Get a free API key from [Brandfetch](https://www.brandfetch.com/api)
2. Add it to your `.env.local` file:
   ```bash
   BRANDFETCH_API_KEY=your_key_here
   ```

### Download Logos

```bash
# From the project root
npx tsx scripts/download-logos.ts
```

This will download SVG logos for all supported services:
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

## Usage in Dashboard

The dashboard automatically uses these logos when displaying service status. The logos are served via the dashboard server and displayed next to each service name.

## Updating Logos

To update logos (e.g., when a service rebrands), simply run the download script again:

```bash
npx tsx scripts/download-logos.ts
```

This will overwrite existing logos with the latest versions from Brandfetch.

## Manual Logo Addition

If a service doesn't have a logo on Brandfetch, you can manually add an SVG file:

1. Download or create an SVG logo
2. Save it as `[service-name].svg` in this directory
3. Ensure the SVG is properly formatted and optimized

## Logo Guidelines

- Format: SVG (vector)
- Size: Should be scalable (SVG advantage)
- Colors: Prefer the service's brand colors
- Style: Keep consistent with service branding
- Optimization: Minimize file size while maintaining quality
