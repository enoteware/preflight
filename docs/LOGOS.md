# Service Logos Guide

This guide explains how to download and use service logos in the Preflight dashboard.

## Overview

The Preflight dashboard can display branded logos for various services (GitHub, Supabase, Resend, Vercel, etc.) next to their status checks. Logos are fetched from [Brandfetch](https://www.brandfetch.com/), a comprehensive brand asset API.

## Setup

### 1. Get a Brandfetch API Key

1. Visit [Brandfetch API](https://www.brandfetch.com/api)
2. Sign up for a free account
3. Generate an API key from your dashboard

### 2. Configure Your Environment

Add your API key to `.env.local` in your project root:

```bash
BRANDFETCH_API_KEY=your_api_key_here
```

Or set it as an environment variable when running the download script:

```bash
BRANDFETCH_API_KEY=your_key npx tsx scripts/download-logos.ts
```

## Downloading Logos

Run the logo download script from your project root:

```bash
npx tsx scripts/download-logos.ts
```

This will:
- ✅ Fetch SVG logos for all supported services
- ✅ Save them to `extension/resources/logos/`
- ✅ Display download progress and any issues
- ✅ Include brand color information

### Supported Services

The script downloads logos for:
- **Version Control & CI/CD**: GitHub, Vercel
- **Databases & Storage**: Supabase, Neon, Redis, Upstash
- **Authentication**: Clerk, Stack Auth, Auth0
- **Email**: Resend
- **Marketing**: Klaviyo
- **Payment**: Stripe
- **Media**: YouTube

## Using Logos in the Dashboard

Once downloaded, logos automatically appear in the dashboard:

1. Start the dashboard server:
   ```bash
   npx tsx scripts/serve-dashboard.ts
   ```

2. Open http://localhost:8080

3. Service checks in the "Service Connections" category will display logos next to service names

## Logo Display

Logos are displayed as:
- **Size**: 20x20 pixels
- **Format**: SVG (vector, scales perfectly)
- **Fallback**: If a logo fails to load, it gracefully hides
- **Position**: Between the status icon and service name

## Customization

### Manual Logo Addition

If a service doesn't have a logo on Brandfetch or you prefer a custom logo:

1. Create or download an SVG logo
2. Save it as `extension/resources/logos/[service-name].svg`
3. Update `SERVICE_LOGO_MAP` in `preflight-dashboard.html`:

```javascript
const SERVICE_LOGO_MAP = {
  'Your Service Name': 'your-service.svg',
  // ... existing mappings
};
```

### Updating Existing Logos

To refresh logos (e.g., after a service rebrand):

```bash
npx tsx scripts/download-logos.ts
```

This overwrites existing logos with the latest versions from Brandfetch.

## Troubleshooting

### No Logos Appear

1. **Check logo files exist**:
   ```bash
   ls extension/resources/logos/
   ```

2. **Verify server is running**:
   - Dashboard must be served via `serve-dashboard.ts`
   - Opening `preflight-dashboard.html` directly won't load logos (CORS)

3. **Check browser console** for 404 errors on logo URLs

### API Key Issues

If the download script fails:

```
❌ BRANDFETCH_API_KEY not set
```

Make sure you've:
- Created a `.env.local` file
- Added `BRANDFETCH_API_KEY=your_key`
- Or set it as an environment variable

### Service Not Found

If Brandfetch doesn't have a brand:

```
⚠️  No brand found for example.com
```

This means the service isn't in Brandfetch's database. You can:
- Manually add a logo (see "Manual Logo Addition" above)
- Request the brand be added to Brandfetch
- Skip that logo (the service will display without one)

## Architecture

### File Structure

```
extension/
  resources/
    logos/
      github.svg
      supabase.svg
      resend.svg
      ... (other service logos)
      README.md
```

### Logo Serving

Logos are served via the dashboard server at `/logos/[filename].svg`:

```
http://localhost:8080/logos/github.svg
```

The server:
- ✅ Validates paths (prevents directory traversal)
- ✅ Sets appropriate MIME type (`image/svg+xml`)
- ✅ Caches logos for 24 hours
- ✅ Returns 404 for missing logos

### Dashboard Integration

The dashboard HTML includes:
- `SERVICE_LOGO_MAP`: Maps service names to logo files
- `getServiceLogo()`: Returns logo URL for a service message
- Dynamic rendering: Adds `<img>` tags for Service Connections

## Advanced Usage

### Batch Download with Custom Delay

Edit `scripts/download-logos.ts` to adjust the delay between requests:

```typescript
// Current: 500ms delay
await new Promise(resolve => setTimeout(resolve, 500));

// Faster: 100ms delay (be careful with rate limits)
await new Promise(resolve => setTimeout(resolve, 100));
```

### Add New Services

To add a new service:

1. Edit `scripts/download-logos.ts`:
   ```typescript
   const SERVICES = {
     'new-service': 'newservice.com',
     // ... existing services
   };
   ```

2. Update `preflight-dashboard.html`:
   ```javascript
   const SERVICE_LOGO_MAP = {
     'New Service Name': 'new-service.svg',
     // ... existing mappings
   };
   ```

3. Download logos:
   ```bash
   npx tsx scripts/download-logos.ts
   ```

## Best Practices

1. **Download logos once**: Logos rarely change, no need to re-download often
2. **Version control**: Commit downloaded logos to your repo (small SVG files)
3. **Fallback gracefully**: Dashboard works fine without logos
4. **Respect rate limits**: Default 500ms delay between API calls
5. **Cache logos**: Server caches for 24 hours to reduce bandwidth

## API Reference

### Brandfetch API

The download script uses:
- **Endpoint**: `https://api.brandfetch.io/v2/brands/{domain}`
- **Authentication**: Bearer token in `Authorization` header
- **Response**: Brand data including logos, colors, fonts
- **Rate Limits**: Check Brandfetch documentation for current limits

### Logo Format

Brandfetch provides logos in multiple formats:
- SVG (preferred - vector, scalable)
- PNG (various sizes)
- JPEG (photos)

The script selects SVG format for best quality and performance.

## Support

For issues:
- **Preflight**: [GitHub Issues](https://github.com/enoteware/preflight/issues)
- **Brandfetch**: [Brandfetch Support](https://www.brandfetch.com/support)
