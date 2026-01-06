# Quick Update Guide

If you have Preflight set up in your project and want to update to the latest version with improved configuration/service separation:

## One-Command Update

```bash
npx tsx src/setup.ts --update
```

This will:
- ✅ Detect your existing installation
- ✅ Update category names ("Environment Variables" → "Configuration")
- ✅ Update service checks to skip when env vars are missing
- ✅ Create backups of your files (`.backup` extension)
- ✅ Preserve your custom env vars and service checks

## What You'll See

### Before Update
```
📦 Environment Variables
   ⚠️ GitHub API key not configured

📦 Service Connections
   ⚠️ GitHub API key not configured
```

### After Update
```
📦 Configuration
   ✅ GITHUB_TOKEN: Set

🌐 Service Connections
   ✅ GitHub API: 200 OK (142ms)
```

## If Something Goes Wrong

1. **Check backups**: Look for `.backup` files in your `scripts/` directory
2. **Restore**: Copy the backup file back if needed
3. **Manual update**: See [MIGRATION.md](MIGRATION.md) for step-by-step instructions

## Need Help?

- Full migration guide: [MIGRATION.md](MIGRATION.md)
- Issues: https://github.com/enoteware/preflight/issues
