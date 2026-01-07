#!/usr/bin/env tsx
/**
 * Test script to verify logo setup is working correctly
 * 
 * Usage: npx tsx scripts/test-logo-setup.ts
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const LOGOS_DIR = join(ROOT, 'extension', 'resources', 'logos');

function testLogoSetup() {
  console.log('\n🧪 Testing Logo Setup\n');
  console.log('═══════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Check if logos directory exists
  console.log('Test 1: Logos directory exists');
  if (existsSync(LOGOS_DIR)) {
    console.log('   ✅ PASS: extension/resources/logos/ exists\n');
    passed++;
  } else {
    console.log('   ❌ FAIL: extension/resources/logos/ not found\n');
    failed++;
  }

  // Test 2: Check if download script exists
  console.log('Test 2: Download script exists');
  const downloadScript = join(ROOT, 'scripts', 'download-logos.ts');
  if (existsSync(downloadScript)) {
    console.log('   ✅ PASS: scripts/download-logos.ts exists\n');
    passed++;
  } else {
    console.log('   ❌ FAIL: scripts/download-logos.ts not found\n');
    failed++;
  }

  // Test 3: Check if dashboard has logo support
  console.log('Test 3: Dashboard has logo support');
  const dashboardPath = join(ROOT, 'preflight-dashboard.html');
  if (existsSync(dashboardPath)) {
    const dashboard = require('fs').readFileSync(dashboardPath, 'utf-8');
    if (dashboard.includes('SERVICE_LOGO_MAP') && dashboard.includes('getServiceLogo')) {
      console.log('   ✅ PASS: Dashboard has logo functions\n');
      passed++;
    } else {
      console.log('   ❌ FAIL: Dashboard missing logo functions\n');
      failed++;
    }
  } else {
    console.log('   ❌ FAIL: preflight-dashboard.html not found\n');
    failed++;
  }

  // Test 4: Check if API key is set
  console.log('Test 4: Brandfetch API key configured');
  if (process.env.BRANDFETCH_API_KEY) {
    console.log('   ✅ PASS: BRANDFETCH_API_KEY is set\n');
    passed++;
  } else {
    console.log('   ⚠️  SKIP: BRANDFETCH_API_KEY not set (optional)\n');
    console.log('      To download logos, set BRANDFETCH_API_KEY in .env.local\n');
  }

  // Test 5: Check if any logos are downloaded
  console.log('Test 5: Logos downloaded');
  if (existsSync(LOGOS_DIR)) {
    const files = readdirSync(LOGOS_DIR).filter(f => f.endsWith('.svg'));
    if (files.length > 0) {
      console.log(`   ✅ PASS: Found ${files.length} logo file(s)\n`);
      files.forEach(f => console.log(`      - ${f}`));
      console.log('');
      passed++;
    } else {
      console.log('   ⚠️  SKIP: No logos downloaded yet\n');
      console.log('      Run: npx tsx scripts/download-logos.ts\n');
    }
  }

  // Test 6: Check if server has logo endpoint
  console.log('Test 6: Server supports logo endpoint');
  const serverScript = join(ROOT, 'scripts', 'serve-dashboard.ts');
  if (existsSync(serverScript)) {
    const server = require('fs').readFileSync(serverScript, 'utf-8');
    if (server.includes('/logos/')) {
      console.log('   ✅ PASS: Server has /logos/ endpoint\n');
      passed++;
    } else {
      console.log('   ❌ FAIL: Server missing /logos/ endpoint\n');
      failed++;
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════\n');
  console.log(`📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✨ Logo setup is ready!\n');
    
    if (!process.env.BRANDFETCH_API_KEY) {
      console.log('Next steps:');
      console.log('1. Get API key: https://www.brandfetch.com/api');
      console.log('2. Add to .env.local: BRANDFETCH_API_KEY=your_key');
      console.log('3. Download logos: npx tsx scripts/download-logos.ts\n');
    } else {
      const files = existsSync(LOGOS_DIR) ? readdirSync(LOGOS_DIR).filter(f => f.endsWith('.svg')) : [];
      if (files.length === 0) {
        console.log('Next step:');
        console.log('- Download logos: npx tsx scripts/download-logos.ts\n');
      } else {
        console.log('🎉 Everything is configured! Start the dashboard to see logos:');
        console.log('   npx tsx scripts/serve-dashboard.ts\n');
      }
    }
  } else {
    console.log('❌ Some tests failed. Please check the output above.\n');
    process.exit(1);
  }
}

testLogoSetup();
