# Preflight Extension Configuration

## New Features

### 1. Category Overrides

You can now manually override which category a check appears in (Environment Checks vs Service Connections).

**Setting**: `preflight.categoryOverrides`

**Type**: Object (key-value pairs)

**Format**: 
- **Key**: Regex pattern to match against check message
- **Value**: `"env"` for Environment Checks or `"service"` for Service Connections

**Example Configuration** (in `.vscode/settings.json`):

```json
{
  "preflight.categoryOverrides": {
    "GITHUB_TOKEN": "env",
    "Database.*": "service",
    ".*API.*": "service",
    "NODE_ENV": "env",
    "Supabase.*": "service"
  }
}
```

**How It Works**:
1. The extension checks each check's message against the patterns
2. If a pattern matches (case-insensitive), it overrides the default categorization
3. Patterns are standard JavaScript regex (e.g., `.*` matches any character)

---

### 2. Environment File Links

The extension now automatically finds where environment variables are defined in your env files and provides quick links to open them.

**Setting**: `preflight.envFiles`

**Type**: Array of strings

**Default**: `[".env.local", ".env", ".env.development"]`

**What It Does**:
- Scans the specified files for environment variable definitions
- Adds a 📄 icon/indicator to checks that have env vars
- Makes the check clickable to jump directly to the line in the file
- Shows the file path and line number in the tooltip

**Example Configuration**:

```json
{
  "preflight.envFiles": [
    ".env.local",
    ".env",
    ".env.development",
    ".env.production",
    "apps/web/.env.local"
  ]
}
```

**How It Works**:
1. When checks run, the extension extracts variable names from check messages
2. It searches through your configured env files for matches like:
   - `VARIABLE_NAME=value`
   - `export VARIABLE_NAME=value`
   - `VARIABLE_NAME = value`
3. If found, it adds file location metadata to the check
4. Click the check to open the file at that specific line

---

## Usage Examples

### Example 1: Categorize All API Checks as Services

```json
{
  "preflight.categoryOverrides": {
    ".*API.*": "service",
    ".*Token.*": "service"
  }
}
```

### Example 2: Move Database Env Vars to Environment Checks

```json
{
  "preflight.categoryOverrides": {
    "DATABASE_URL": "env",
    "POSTGRES.*": "env"
  }
}
```

### Example 3: Monorepo Setup

```json
{
  "preflight.envFiles": [
    ".env.local",
    "apps/web/.env.local",
    "apps/api/.env.local",
    "packages/shared/.env"
  ]
}
```

---

## UI Indicators

### Environment File Available
- **Icon**: 📄 (in tooltip)
- **Click Action**: Opens the file at the specific line
- **Context Menu**: "Open Environment File" option

### Help URL Available
- **Icon**: 🔗 (link icon in inline actions)
- **Click Action**: Opens the help URL in browser
- **Context Menu**: "Copy Help URL" option

---

## Tips

1. **Regex Patterns**: Use simple patterns like `"NEXT_PUBLIC_.*"` to match all Next.js public env vars
2. **Priority**: Env file links take priority over help URLs when both are available
3. **Performance**: The extension only scans files that exist, so adding many paths is fine
4. **Git Ignored**: Remember `.env.local` is typically git-ignored, so it won't appear in other team members' repos

---

## Troubleshooting

### "Environment variable not found"
- Check that the variable name in your check message matches exactly (case-sensitive)
- Verify the file is in your `preflight.envFiles` list
- Make sure the file exists in your workspace

### "Category override not working"
- Test your regex pattern at [regex101.com](https://regex101.com)
- Remember patterns are case-insensitive by default
- Check for typos in the pattern

### "Click does nothing"
- Ensure the file path is relative to workspace root
- Check that the file hasn't been moved or deleted
- Try refreshing the checks
