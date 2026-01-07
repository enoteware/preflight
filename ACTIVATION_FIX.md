# Extension Activation Timing Fix

## Issue
**GitHub Issue #1:** Extension activation fails due to early initialization timing

The VS Code extension was experiencing race conditions during activation, causing failures when:
- Tree views weren't fully registered yet
- Workspace folders weren't available
- VS Code UI wasn't fully initialized

## Root Cause

The extension used `onStartupFinished` activation event and immediately called `refreshChecks()` without waiting for:
1. Tree view registration to complete
2. Workspace to be fully loaded
3. VS Code UI to be ready

This caused errors like:
- "Cannot read property of undefined" when accessing tree providers
- Workspace folder not found errors
- UI elements not rendering correctly

## Solution Implemented

### 1. **Delayed Initialization (extension.ts)**
```typescript
// Added 1.5 second delay after activation
const initTimeout = setTimeout(async () => {
  // Verify workspace is ready
  if (!vscode.workspace.workspaceFolders?.[0]) {
    console.log('No workspace folder available, skipping initial check');
    return;
  }
  
  // Run initial check
  await refreshChecks();
  
  // Set up auto-refresh
  if (autoRefresh) {
    startAutoRefresh(refreshInterval);
  }
  
  // Start dashboard server if enabled
  if (autoStartDashboard) {
    startDashboardServer(context);
  }
}, 1500);
```

**Why 1.5 seconds?**
- Ensures VS Code UI is fully rendered
- Allows tree views to complete registration
- Gives workspace time to fully initialize
- Still feels instant to users

### 2. **Workspace Readiness Checks (extension.ts)**
```typescript
async function refreshChecks() {
  // Check workspace readiness
  if (!vscode.workspace.workspaceFolders?.[0]) {
    console.log('No workspace folder available, cannot run checks');
    checksProvider.updateChecks([{
      status: 'warning',
      message: 'No workspace folder open',
      details: 'Open a folder or workspace to run preflight checks',
      timestamp: Date.now()
    }]);
    return;
  }
  // ... rest of function
}
```

### 3. **Loading State (treeDataProvider.ts)**
```typescript
export class PreflightTreeDataProvider {
  private isInitialized = false;
  
  getChildren(element?: CheckTreeItem): Thenable<CheckTreeItem[]> {
    // Show loading message on first load
    if (!this.isInitialized) {
      const loadingItem = new CheckTreeItem(
        'Loading...',
        'warning',
        'Initializing preflight checks'
      );
      loadingItem.iconPath = new vscode.ThemeIcon('loading~spin');
      return Promise.resolve([loadingItem]);
    }
    // ... rest of function
  }
}
```

### 4. **Improved Error Handling**
- Removed intrusive activation notification
- Better logging for debugging
- Graceful degradation when workspace not ready
- Reduced notification spam

## Changes Made

### Files Modified
1. **extension/src/extension.ts**
   - Added delayed initialization with timeout
   - Added workspace readiness verification
   - Improved error handling and logging
   - Removed activation notification message

2. **extension/src/treeDataProvider.ts**
   - Added `isInitialized` flag
   - Added loading state with spinner icon
   - Better empty state handling

3. **extension/package.json**
   - Bumped version to 1.0.1

4. **extension/CHANGELOG.md** (new)
   - Documented all changes

## Testing Recommendations

1. **Cold Start Test**
   - Close VS Code completely
   - Open VS Code with a workspace
   - Verify extension activates without errors
   - Check tree views show loading state then populate

2. **No Workspace Test**
   - Open VS Code without a workspace
   - Verify extension handles gracefully
   - Check for helpful message in tree view

3. **Quick Reload Test**
   - Reload window multiple times quickly
   - Verify no race conditions or crashes

4. **Configuration Change Test**
   - Change auto-refresh settings
   - Verify settings apply correctly
   - Check no duplicate timers

## Deployment

New VSIX package built:
- **File:** `extension/preflight-status-1.0.1.vsix`
- **Version:** 1.0.1
- **Size:** 35.66 KB

To install:
```bash
code --install-extension extension/preflight-status-1.0.1.vsix
```

Or in VS Code:
1. Open Extensions view (Cmd+Shift+X)
2. Click "..." menu
3. Select "Install from VSIX..."
4. Choose `preflight-status-1.0.1.vsix`

## Monitoring

Check VS Code's Output panel (View → Output → Extension Host) for logs:
- "Preflight Status extension activating..."
- "Scheduling delayed initialization..."
- "Preflight Status extension fully initialized"

## Prevention

To prevent similar issues in the future:
1. Always add delays for early activation events
2. Verify workspace readiness before operations
3. Add loading states to UI components
4. Test cold starts and edge cases
5. Use proper error boundaries

## Related
- GitHub Issue: #1
- Activation Event: `onStartupFinished`
- VS Code API: Tree Data Providers, Workspace API
