#!/usr/bin/env tsx
/**
 * Unified installation script for Preflight Toolkit
 * Handles both project setup and VS Code extension installation atomically
 * 
 * Usage: npx @enoteware/preflight install [--with-extension] [--skip-extension]
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

async function detectIDE(): Promise<'vscode' | 'cursor' | 'unknown'> {
  try {
    // Try to detect which IDE is running
    const vscodePath = execSync('which code', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (vscodePath) return 'vscode';
  } catch {
    // code not found
  }

  try {
    const cursorPath = execSync('which cursor', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (cursorPath) return 'cursor';
  } catch {
    // cursor not found
  }

  return 'unknown';
}

async function buildExtension(extensionPath: string): Promise<string> {
  console.log('📦 Building VS Code extension...\n');
  
  try {
    // Check if node_modules exists, if not install
    if (!existsSync(join(extensionPath, 'node_modules'))) {
      console.log('   Installing extension dependencies...');
      execSync('npm install', { 
        cwd: extensionPath, 
        stdio: 'inherit',
        timeout: 60000 
      });
    }

    // Compile TypeScript
    console.log('   Compiling TypeScript...');
    execSync('npm run compile', { 
      cwd: extensionPath, 
      stdio: 'inherit',
      timeout: 30000 
    });

    // Package extension
    console.log('   Packaging extension...');
    execSync('npm run package', { 
      cwd: extensionPath, 
      stdio: 'inherit',
      timeout: 30000 
    });

    // Find the generated VSIX file
    const files = execSync('ls -1 *.vsix 2>/dev/null', { 
      cwd: extensionPath, 
      encoding: 'utf-8' 
    }).trim().split('\n').filter(f => f);
    
    if (files.length === 0) {
      throw new Error('No VSIX file generated');
    }

    return join(extensionPath, files[0]);
  } catch (error) {
    throw new Error(`Failed to build extension: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function installExtension(vsixPath: string, ide: 'vscode' | 'cursor' | 'unknown'): Promise<void> {
  console.log('\n📥 Installing extension...\n');

  const command = ide === 'cursor' ? 'cursor' : ide === 'vscode' ? 'code' : null;
  
  if (!command) {
    console.log('⚠️  Could not detect VS Code or Cursor.');
    console.log('   Please install the extension manually:');
    console.log(`   code --install-extension "${vsixPath}" --force`);
    console.log(`   or`);
    console.log(`   cursor --install-extension "${vsixPath}" --force`);
    return;
  }

  try {
    execSync(`${command} --install-extension "${vsixPath}" --force`, {
      stdio: 'inherit',
      timeout: 30000
    });
    console.log(`\n✅ Extension installed successfully!`);
    console.log(`\n💡 Next step: Reload your ${ide === 'cursor' ? 'Cursor' : 'VS Code'} window:`);
    console.log(`   Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)`);
    console.log(`   Type "Reload Window" and press Enter\n`);
  } catch (error) {
    console.error(`\n❌ Failed to install extension: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`\n   Please install manually:`);
    console.log(`   ${command} --install-extension "${vsixPath}" --force\n`);
  }
}

async function findPreflightRepo(): Promise<string | null> {
  // Check if we're running from the preflight repo itself
  const currentDir = process.cwd();
  if (existsSync(join(currentDir, 'extension', 'package.json')) && 
      existsSync(join(currentDir, 'src', 'setup.ts'))) {
    return currentDir;
  }

  // Check common temp locations
  const tempDirs = [
    '/tmp/preflight-setup',
    '/tmp/preflight',
    join(process.env.HOME || '', '.preflight'),
  ];

  for (const dir of tempDirs) {
    if (existsSync(join(dir, 'extension', 'package.json')) && 
        existsSync(join(dir, 'src', 'setup.ts'))) {
      return dir;
    }
  }

  return null;
}

async function clonePreflightRepo(targetPath: string): Promise<string> {
  console.log('📥 Cloning Preflight repository...\n');
  
  try {
    // Create temp directory if it doesn't exist
    mkdirSync(targetPath, { recursive: true });
    
    // Clone or update
    if (existsSync(join(targetPath, '.git'))) {
      console.log('   Updating existing repository...');
      execSync('git fetch origin && git reset --hard origin/main', {
        cwd: targetPath,
        stdio: 'inherit',
        timeout: 60000
      });
    } else {
      console.log('   Cloning repository...');
      execSync(`git clone https://github.com/enoteware/preflight.git "${targetPath}"`, {
        stdio: 'inherit',
        timeout: 60000
      });
    }
    
    return targetPath;
  } catch (error) {
    throw new Error(`Failed to clone/update repository: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const withExtension = args.includes('--with-extension');
  const skipExtension = args.includes('--skip-extension');
  const projectPath = args.find(arg => !arg.startsWith('--') && arg !== 'install') || process.cwd();

  // Change to project directory
  process.chdir(projectPath);
  const projectDir = process.cwd();

  console.log('🚀 Preflight Toolkit Installation\n');
  console.log(`📁 Project: ${projectDir}\n`);

  try {
    // Step 1: Find or clone Preflight repo
    let preflightRepo = await findPreflightRepo();
    
    if (!preflightRepo) {
      // Clone to temp location
      const tempPath = join(process.env.TMPDIR || '/tmp', 'preflight-install');
      preflightRepo = await clonePreflightRepo(tempPath);
    } else {
      console.log(`✅ Found Preflight repository at: ${preflightRepo}\n`);
    }

    // Step 2: Check for existing installation and handle updates
    const preflightCheckPath = join(projectDir, 'scripts', 'preflight-check.ts');
    const hasExistingInstallation = existsSync(preflightCheckPath);
    const setupPath = join(preflightRepo, 'src', 'setup.ts');
    
    if (!existsSync(setupPath)) {
      throw new Error(`Setup script not found at: ${setupPath}`);
    }
    
    if (hasExistingInstallation) {
      console.log('📋 Existing Preflight installation detected\n');
      
      // Check if it needs updating (old structure)
      try {
        const existingCheck = readFileSync(preflightCheckPath, 'utf-8');
        const needsUpdate = !existingCheck.includes("category: 'Configuration'");
        
        if (needsUpdate) {
          console.log('🔄 Your installation uses the old structure.\n');
          console.log('   Running update to migrate to new structure...\n');
          console.log('   (This will preserve your custom service checks)\n');
          
          // Run update instead of fresh setup
          execSync(`npx tsx "${setupPath}" --update`, {
            cwd: projectDir,
            stdio: 'inherit',
            timeout: 60000
          });
          console.log('\n✅ Update complete!\n');
        } else {
          console.log('✅ Your installation is already up to date!\n');
          console.log('   Running setup to ensure all files are current...\n');
          
          // Run normal setup (will update files but preserve structure)
          execSync(`npx tsx "${setupPath}"`, {
            cwd: projectDir,
            stdio: 'inherit',
            timeout: 60000
          });
          console.log('\n✅ Setup complete!\n');
        }
      } catch (error) {
        console.log('⚠️  Could not read existing installation, proceeding with fresh setup...\n');
        execSync(`npx tsx "${setupPath}"`, {
          cwd: projectDir,
          stdio: 'inherit',
          timeout: 60000
        });
        console.log('\n✅ Setup complete!\n');
      }
    } else {
      // Step 3: Run fresh setup in user's project
      console.log('📝 Setting up Preflight in your project...\n');
      
      execSync(`npx tsx "${setupPath}"`, {
        cwd: projectDir,
        stdio: 'inherit',
        timeout: 60000
      });
      console.log('\n✅ Project setup complete!\n');
    }

    console.log('\n✅ Project setup complete!\n');

    // Step 4: Build and install extension if requested
    if (withExtension && !skipExtension) {
      const extensionPath = join(preflightRepo, 'extension');
      
      if (!existsSync(join(extensionPath, 'package.json'))) {
        console.log('⚠️  Extension directory not found, skipping extension installation.\n');
      } else {
        try {
          const vsixPath = await buildExtension(extensionPath);
          const ide = await detectIDE();
          await installExtension(vsixPath, ide);
        } catch (error) {
          console.error(`\n⚠️  Extension installation failed: ${error instanceof Error ? error.message : String(error)}`);
          console.log('   You can install it manually later by running:');
          console.log(`   cd ${extensionPath}`);
          console.log('   npm install && npm run compile && npm run package');
          console.log('   code --install-extension preflight-status-*.vsix --force\n');
        }
      }
    } else if (!skipExtension) {
      console.log('💡 To install the VS Code extension, run:');
      console.log(`   npx @enoteware/preflight install --with-extension\n`);
    }

    // Step 4: Show next steps
    console.log('📋 Next Steps:\n');
    console.log('   [ ] 1. Run: npm install (to install tsx and dotenv)');
    console.log('   [ ] 2. Try: npm run preflight (to test checks)');
    if (!withExtension || skipExtension) {
      console.log('   [ ] 3. Install extension: npx @enoteware/preflight install --with-extension');
    } else {
      console.log('   [ ] 3. Reload VS Code/Cursor window (Cmd+Shift+P → "Reload Window")');
    }
    console.log('   [ ] 4. Run: npm run preflight:dashboard (to start dashboard server)');
    console.log('   [ ] 5. Open: http://localhost:8080 (in browser)');
    console.log('\n💡 Tip: Customize env.ts and services.ts in scripts/preflight-validators/ for your project\n');

  } catch (error) {
    console.error('\n❌ Installation failed:', error instanceof Error ? error.message : String(error));
    console.error('\nIf you need help, check: https://github.com/enoteware/preflight');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
