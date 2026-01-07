#!/usr/bin/env tsx
/**
 * Download SVG logos for services from public sources
 * No API key required - uses publicly available logo sources
 * 
 * Usage: npx tsx scripts/download-logos-public.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Public logo sources (CDNs, official sites, etc.)
const PUBLIC_LOGO_SOURCES: Record<string, string> = {
  'github': 'https://cdn.simpleicons.org/github/181717',
  'supabase': 'https://cdn.simpleicons.org/supabase/3ECF8E',
  'resend': 'https://cdn.simpleicons.org/resend/000000',
  'vercel': 'https://cdn.simpleicons.org/vercel/000000',
  'klaviyo': 'https://cdn.simpleicons.org/klaviyo/000000',
  'upstash': 'https://cdn.simpleicons.org/upstash/00E9A3',
  'redis': 'https://cdn.simpleicons.org/redis/DC382D',
  'neon': 'https://avatars.githubusercontent.com/u/77690634?s=200&v=4', // Will need conversion
  'clerk': 'https://cdn.simpleicons.org/clerk/6C47FF',
  'auth0': 'https://cdn.simpleicons.org/auth0/EB5424',
  'stripe': 'https://cdn.simpleicons.org/stripe/008CDD',
  'paypal': 'https://cdn.simpleicons.org/paypal/00457C',
  'trello': 'https://cdn.simpleicons.org/trello/0052CC',
  'youtube': 'https://cdn.simpleicons.org/youtube/FF0000',
};

async function downloadLogo(service: string, url: string): Promise<void> {
  try {
    console.log(`📥 Fetching logo for ${service}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    
    // Ensure logos directory exists
    const logosDir = join(process.cwd(), 'extension', 'resources', 'logos');
    if (!existsSync(logosDir)) {
      mkdirSync(logosDir, { recursive: true });
    }

    // Save the SVG file
    const outputPath = join(logosDir, `${service}.svg`);
    writeFileSync(outputPath, content, 'utf-8');
    
    console.log(`   ✅ Saved to: extension/resources/logos/${service}.svg\n`);
    
  } catch (error) {
    console.error(`   ❌ Error downloading logo for ${service}:`, error instanceof Error ? error.message : String(error));
    console.log('');
  }
}

async function main() {
  console.log('\n🎨 Downloading service logos from public sources\n');
  console.log('═══════════════════════════════════════════\n');

  // Download logos sequentially
  for (const [service, url] of Object.entries(PUBLIC_LOGO_SOURCES)) {
    await downloadLogo(service, url);
    // Small delay to be nice to CDNs
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('═══════════════════════════════════════════');
  console.log('✨ Logo download complete!\n');
  console.log('📁 Logos saved to: extension/resources/logos/\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
