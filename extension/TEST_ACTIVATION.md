# Testing Extension Activation Fix

## Quick Test Checklist

### ✅ Test 1: Normal Activation
**Steps:**
1. Close VS Code completely
2. Open VS Code with the preflight workspace
3. Open Output panel (View → Output)
4. Select "Extension Host" from dropdown
5. Look for Preflight Status logs

**Expected Output:**
```
Preflight Status extension activating...
Registering tree data providers...
Tree data providers registered successfully
Scheduling delayed initialization...
[after ~1.5 seconds]
Preflight Status extension fully initialized
Starting preflight checks refresh...
Preflight checks completed: {...}
Tree views updated
Refresh complete
```

**Success Criteria:**
- ✅ No errors in console
- ✅ Tree views show "Loading..." then populate
- ✅ Status bar updates
- ✅ No crash or activation failure

---

### ✅ Test 2: No Workspace
**Steps:**
1. Close VS Code
2. Open VS Code WITHOUT opening a folder (File → New Window)
3. Check Preflight Status tree views

**Expected Behavior:**
- Tree views show: "No workspace folder open"
- No errors or crashes
- Extension remains stable

**Success Criteria:**
- ✅ Helpful message displayed
- ✅ No error notifications
- ✅ Extension doesn't crash

---

### ✅ Test 3: Quick Window Reload
**Steps:**
1. Open VS Code with workspace
2. Press Cmd+R (or Ctrl+R) to reload window
3. Immediately press Cmd+R again (2-3 times quickly)
4. Check for errors

**Expected Behavior:**
- Extension reloads cleanly each time
- No duplicate timers or processes
- Proper cleanup on each reload

**Success Criteria:**
- ✅ No race condition errors
- ✅ No duplicate dashboard servers
- ✅ Clean activation each time

---

### ✅ Test 4: Configuration Changes
**Steps:**
1. Open Settings (Cmd+,)
2. Search for "preflight"
3. Toggle "Auto Refresh" off and on
4. Change "Refresh Interval" to different values
5. Toggle "Auto Start Dashboard" off and on

**Expected Behavior:**
- Settings apply immediately
- No errors when changing settings
- Dashboard server starts/stops correctly

**Success Criteria:**
- ✅ Settings take effect
- ✅ No duplicate timers
- ✅ Dashboard server responds to changes

---

### ✅ Test 5: Tree View Interaction
**Steps:**
1. Wait for checks to complete
2. Click on items in tree views
3. Try "Refresh" button
4. Try "Run Check" button
5. Click items with env file links

**Expected Behavior:**
- Items are clickable
- Refresh works without errors
- Env files open at correct line
- Help URLs open in browser

**Success Criteria:**
- ✅ All interactions work
- ✅ No undefined errors
- ✅ Proper navigation

---

## Debugging Tips

### View Extension Logs
```
View → Output → Extension Host
```

### Check for Errors
Look for these patterns:
- ❌ "Cannot read property of undefined"
- ❌ "workspace.workspaceFolders is undefined"
- ❌ "Tree view not registered"
- ❌ Any stack traces

### Expected Log Sequence
```
1. "Preflight Status extension activating..."
2. "Registering tree data providers..."
3. "Tree data providers registered successfully"
4. "Scheduling delayed initialization..."
5. [1.5 second delay]
6. "Preflight Status extension fully initialized"
7. "Starting preflight checks refresh..."
8. "Preflight checks completed: {...}"
9. "Updating tree views..."
10. "Tree views updated"
11. "Refresh complete"
```

---

## Known Issues (Should NOT Occur)

These issues were present in v1.0.0 and should be FIXED in v1.0.1:

- ❌ Extension crashes on activation
- ❌ Tree views show errors immediately
- ❌ "Cannot read property" errors
- ❌ Workspace not found errors during startup
- ❌ Race conditions with tree view registration

If any of these occur, the fix needs revision.

---

## Installation for Testing

### Install New Version
```bash
cd /Users/elliotnoteware/code/preflight/extension
code --install-extension preflight-status-1.0.1.vsix
```

### Verify Version
1. Open Extensions view (Cmd+Shift+X)
2. Search for "Preflight Status"
3. Check version shows **1.0.1**

### Reload Window
```
Cmd+R (Mac) or Ctrl+R (Windows/Linux)
```

---

## Success Metrics

### Before Fix (v1.0.0)
- ❌ Activation failures
- ❌ Race conditions
- ❌ Poor error handling
- ❌ No loading states

### After Fix (v1.0.1)
- ✅ Smooth activation
- ✅ No race conditions
- ✅ Graceful error handling
- ✅ Loading states with spinner
- ✅ Better user experience

---

## Reporting Issues

If you encounter problems:

1. **Check Output panel** for error messages
2. **Note the exact steps** to reproduce
3. **Check version** (should be 1.0.1)
4. **Capture logs** from Extension Host output
5. **Report to GitHub** with details

---

**Test Status:** Ready for testing  
**Version:** 1.0.1  
**Date:** 2026-01-07
