# Testing Guide: New Features (v1.1)

## Features to Test

1. **Category Overrides** - Manual control over check categorization
2. **Environment File Links** - Automatic linking to env var definitions

---

## Test Setup

### 1. Install the Extension

```bash
cd /Users/elliotnoteware/code/preflight/extension

# Install the packaged extension
code --install-extension preflight-status-1.0.0.vsix
# OR for Cursor:
cursor --install-extension preflight-status-1.0.0.vsix
```

### 2. Reload the Window

- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Reload Window"
- Press Enter

### 3. Configure Test Settings

Add to `.vscode/settings.json` in your test project:

```json
{
  "preflight.autoRefresh": true,
  "preflight.refreshInterval": 10,
  "preflight.quickMode": true,
  "preflight.showInStatusBar": true,
  "preflight.categoryOverrides": {
    "GITHUB_TOKEN": "env",
    ".*API.*": "service",
    "Database.*": "service",
    "Node.*": "env"
  },
  "preflight.envFiles": [
    ".env.local",
    ".env",
    ".env.development"
  ]
}
```

### 4. Create Test Environment Files

Create `.env.local` with test variables:

```bash
cat > .env.local << 'EOF'
# Test environment variables
NODE_ENV=development
GITHUB_TOKEN=ghp_test_token_here
DATABASE_URL=postgresql://localhost:5432/test
NEXT_PUBLIC_API_URL=https://api.example.com
VERCEL_TOKEN=test_vercel_token
EOF
```

---

## Test Cases

### ✅ Test 1: Category Overrides

**Objective**: Verify that checks can be manually categorized using regex patterns.

**Steps:**
1. Open VS Code/Cursor in a project with preflight setup
2. Open the Preflight Status sidebar
3. Look at "Environment Checks" and "Service Connections" views
4. Check that `GITHUB_TOKEN` appears in **Environment Checks** (due to override)
5. Check that any check with "API" appears in **Service Connections**
6. Check that `Node` checks appear in **Environment Checks**

**Expected Result:**
- ✅ Checks are categorized according to the overrides
- ✅ Regex patterns work (e.g., `.*API.*` matches "GitHub API", "Public API", etc.)
- ✅ Override takes precedence over default categorization

**How to Verify:**
```bash
# View current check output
npm run preflight
```

Look for checks and verify they appear in the correct sidebar category.

---

### ✅ Test 2: Environment File Links - Basic

**Objective**: Verify that env vars are detected and linked to their file locations.

**Steps:**
1. Ensure `.env.local` exists with variables
2. Run preflight checks: `npm run preflight`
3. Open Preflight Status sidebar
4. Hover over a check that references an env var (e.g., `GITHUB_TOKEN`)
5. Look for "📄 Found in: .env.local:X" in tooltip
6. Click the check

**Expected Result:**
- ✅ Tooltip shows file location: "📄 Found in: .env.local:2"
- ✅ Clicking opens `.env.local` at the correct line
- ✅ Cursor is positioned at the variable definition

**How to Verify:**
- Hover shows: `GITHUB_TOKEN: SET\n\n📄 Found in: .env.local:3`
- Click opens the file and jumps to line 3

---

### ✅ Test 3: Environment File Links - Multiple Files

**Objective**: Verify that the extension searches multiple env files.

**Steps:**
1. Create multiple env files:
   ```bash
   echo "TEST_VAR_1=value1" > .env.local
   echo "TEST_VAR_2=value2" > .env
   echo "TEST_VAR_3=value3" > .env.development
   ```
2. Add checks for these variables to `scripts/preflight-validators/env.ts`
3. Run preflight checks
4. Verify each check links to the correct file

**Expected Result:**
- ✅ `TEST_VAR_1` links to `.env.local`
- ✅ `TEST_VAR_2` links to `.env`
- ✅ `TEST_VAR_3` links to `.env.development`
- ✅ Search order is respected (first match wins)

---

### ✅ Test 4: Environment File Links - Monorepo

**Objective**: Verify support for monorepo structures with nested env files.

**Steps:**
1. Update settings to include nested paths:
   ```json
   {
     "preflight.envFiles": [
       ".env.local",
       "apps/web/.env.local",
       "apps/api/.env.local"
     ]
   }
   ```
2. Create nested env files:
   ```bash
   mkdir -p apps/web apps/api
   echo "WEB_VAR=value" > apps/web/.env.local
   echo "API_VAR=value" > apps/api/.env.local
   ```
3. Add checks for these variables
4. Verify links work

**Expected Result:**
- ✅ Variables in nested files are found
- ✅ Clicking opens the correct nested file
- ✅ Relative paths work correctly

---

### ✅ Test 5: Override Regex Patterns

**Objective**: Test various regex patterns for category overrides.

**Patterns to Test:**
```json
{
  "EXACT_MATCH": "env",           // Exact match
  ".*WILDCARD.*": "service",      // Wildcard
  "^START_PATTERN": "env",        // Start anchor
  "END_PATTERN$": "service",      // End anchor
  "[A-Z_]+_TOKEN": "env"          // Character class
}
```

**Expected Result:**
- ✅ Exact matches work
- ✅ Wildcards work (case-insensitive)
- ✅ Anchors work
- ✅ Character classes work
- ✅ Invalid regex patterns are ignored gracefully

---

### ✅ Test 6: Settings Persistence

**Objective**: Verify settings persist across window reloads.

**Steps:**
1. Configure settings in `.vscode/settings.json`
2. Reload window
3. Check that settings are still applied
4. Modify settings
5. Verify changes take effect immediately (or after next refresh)

**Expected Result:**
- ✅ Settings persist across reloads
- ✅ Changes are applied on next refresh cycle
- ✅ No errors in extension logs

---

### ✅ Test 7: Error Handling

**Objective**: Verify graceful error handling for edge cases.

**Test Cases:**

1. **Missing env file:**
   - Add non-existent file to `preflight.envFiles`
   - Expected: No errors, just skips the file

2. **Invalid regex pattern:**
   - Add invalid regex to `categoryOverrides` (e.g., `"[invalid": "env"`)
   - Expected: Pattern is skipped, no crash

3. **Empty env file:**
   - Create empty `.env.local`
   - Expected: No matches, no errors

4. **Malformed env file:**
   - Add invalid lines to env file
   - Expected: Valid lines still work, invalid lines ignored

**Expected Result:**
- ✅ No crashes or errors
- ✅ Extension continues to work
- ✅ Errors logged to Output panel (if any)

---

## Verification Checklist

- [ ] Extension installs successfully
- [ ] Extension activates on window load
- [ ] Sidebar shows "Preflight Status" icon
- [ ] Status bar shows preflight status
- [ ] Category overrides work
- [ ] Env file links appear in tooltips
- [ ] Clicking links opens files at correct lines
- [ ] Multiple env files are searched
- [ ] Monorepo paths work
- [ ] Regex patterns work correctly
- [ ] Settings persist across reloads
- [ ] Error handling is graceful
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Extension performance is good

---

## Performance Considerations

**Expected Performance:**
- File scanning: < 50ms for typical projects
- Regex matching: < 1ms per check
- No noticeable UI lag
- Refresh cycle: ~1-2 seconds

**If performance is slow:**
- Reduce number of env files in `preflight.envFiles`
- Simplify regex patterns in `categoryOverrides`
- Check for large env files (> 1000 lines)

---

## Debugging

**Extension logs:**
```
View → Output → Select "Extension Host" from dropdown
```

**Check settings:**
```bash
cat .vscode/settings.json
```

**Test manually:**
```bash
# Run checks
npm run preflight

# Check env files exist
ls -la .env*

# Test regex pattern
node -e "console.log(/.*API.*/.test('GitHub API'))"
```

---

## Known Limitations

1. **Env file format**: Only supports `KEY=value` format (not YAML, JSON, etc.)
2. **Regex performance**: Very complex patterns might slow down categorization
3. **File size**: Large env files (> 10MB) might slow down scanning
4. **Line number accuracy**: Comments and multiline values might affect line numbers

---

## Success Criteria

✅ **All tests pass**
✅ **No errors in console**
✅ **Features work as documented**
✅ **Performance is acceptable**
✅ **User experience is smooth**

---

## Reporting Issues

If tests fail, collect:
1. Extension version
2. VS Code/Cursor version
3. Test case that failed
4. Error messages from Output panel
5. Settings configuration used
6. Sample env file (without sensitive data)

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Document any issues found
3. ✅ Update version number if needed
4. ✅ Commit changes
5. ✅ Create release notes
6. ✅ Publish extension (if applicable)
