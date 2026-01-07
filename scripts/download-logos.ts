#!/usr/bin/env tsx
/**
 * Download SVG logos for services using Brandfetch API
 * 
 * Usage: 
 *   BRANDFETCH_API_KEY=your_key npx tsx scripts/download-logos.ts
 *   Or add BRANDFETCH_API_KEY to your .env.local file
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local if it exists
const envLocalPath = join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  try {
    const envContent = readFileSync(envLocalPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (error) {
    // Silently fail if we can't read .env.local
  }
}

// Service domain mappings for Brandfetch
const SERVICES = {
  'github': 'github.com',
  'supabase': 'supabase.com',
  'resend': 'resend.com',
  'vercel': 'vercel.com',
  'klaviyo': 'klaviyo.com',
  'upstash': 'upstash.com',
  'redis': 'redis.io',
  'neon': 'neon.tech',
  'clerk': 'clerk.com',
  'stack-auth': 'stack-auth.com',
  'auth0': 'auth0.com',
  'stripe': 'stripe.com',
  'paypal': 'paypal.com',
  'trello': 'trello.com',
  'youtube': 'youtube.com',
} as const;

interface BrandfetchResponse {
  name: string;
  domain: string;
  logos: Array<{
    type: string;
    theme: string;
    formats: Array<{
      src: string;
      format: string;
      size?: number;
    }>;
  }>;
  colors: Array<{
    hex: string;
    type: string;
  }>;
}

async function downloadLogo(service: string, domain: string): Promise<void> {
  const apiKey = process.env.BRANDFETCH_API_KEY;
  
  if (!apiKey) {
    console.error('❌ BRANDFETCH_API_KEY not set');
    console.error('   Get an API key at: https://www.brandfetch.com/api');
    process.exit(1);
  }

  try {
    console.log(`📥 Fetching logo for ${service} (${domain})...`);
    
    const response = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`   ⚠️  No brand found for ${domain}`);
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BrandfetchResponse = await response.json();
    
    // Find the best SVG logo (prefer icon or logo, light/dark theme)
    const svgLogo = data.logos?.find(logo => 
      logo.formats.some(f => f.format === 'svg')
    );

    if (!svgLogo) {
      console.warn(`   ⚠️  No SVG logo found for ${service}`);
      return;
    }

    // Get the SVG format
    const svgFormat = svgLogo.formats.find(f => f.format === 'svg');
    if (!svgFormat?.src) {
      console.warn(`   ⚠️  No SVG source found for ${service}`);
      return;
    }

    // Download the SVG file
    console.log(`   🔗 Downloading from: ${svgFormat.src}`);
    const svgResponse = await fetch(svgFormat.src);
    
    if (!svgResponse.ok) {
      throw new Error(`Failed to download SVG: ${svgResponse.status}`);
    }

    const svgContent = await svgResponse.text();
    
    // Ensure logos directory exists
    const logosDir = join(process.cwd(), 'extension', 'resources', 'logos');
    if (!existsSync(logosDir)) {
      mkdirSync(logosDir, { recursive: true });
    }

    // Save the SVG file
    const outputPath = join(logosDir, `${service}.svg`);
    writeFileSync(outputPath, svgContent, 'utf-8');
    
    console.log(`   ✅ Saved to: extension/resources/logos/${service}.svg`);
    
    // Also save brand colors if available
    if (data.colors && data.colors.length > 0) {
      const primaryColor = data.colors.find(c => c.type === 'accent' || c.type === 'primary')?.hex 
        || data.colors[0]?.hex;
      if (primaryColor) {
        console.log(`   🎨 Primary color: ${primaryColor}`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error downloading logo for ${service}:`, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log('\n🎨 Downloading service logos from Brandfetch\n');
  console.log('═══════════════════════════════════════════\n');

  // Download logos sequentially to avoid rate limiting
  for (const [service, domain] of Object.entries(SERVICES)) {
    await downloadLogo(service, domain);
    // Add a small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('✨ Logo download complete!\n');
  console.log('📁 Logos saved to: extension/resources/logos/\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
