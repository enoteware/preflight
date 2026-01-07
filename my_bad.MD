# Mistake Ledger

This file tracks coding mistakes, logic errors, and oversights to prevent repeated errors.

## Entry #1 - Extension Activation Race Condition
**Date:** 2026-01-07  
**Issue:** GitHub Issue #1 - Extension activation fails due to early initialization timing

### What the mistake was
The VS Code extension called `refreshChecks()` immediately upon activation without waiting for:
- Tree view registration to complete
- Workspace to be fully loaded  
- VS Code UI to be ready

This caused race conditions where the extension would try to access tree providers, workspace folders, or UI elements before they were initialized.

### Where it happened
**File:** `extension/src/extension.ts`  
**Function:** `activate()`  
**Line:** ~106 (original code)

```typescript
// WRONG: Immediate call without waiting
export function activate(context: vscode.ExtensionContext) {
  // ... registration code ...
  
  // Initial check - TOO EARLY!
  refreshChecks(); // ❌ Called immediately
  
  // ... rest of setup ...
}
```

### Why it happened
**Root causes:**
1. **Misunderstanding of activation events** - Used `onStartupFinished` which fires very early in VS Code startup
2. **Assumption that registration is synchronous** - Assumed tree view registration was complete after calling `registerTreeDataProvider()`
3. **No workspace readiness check** - Didn't verify workspace was available before running checks
4. **Missing loading states** - No UI feedback during initialization

**Oversight:**
- Didn't test cold start scenarios thoroughly
- Didn't consider timing between activation and workspace availability
- Assumed VS Code APIs were immediately ready after registration

### How it was fixed
1. **Added delayed initialization** - 1.5 second timeout to ensure VS Code is fully ready
2. **Added workspace readiness checks** - Verify workspace exists before operations
3. **Added loading states** - Show "Loading..." in tree views during initialization
4. **Improved error handling** - Graceful degradation when workspace not ready
5. **Better logging** - Track initialization sequence for debugging

**Code fix:**
```typescript
// CORRECT: Delayed initialization with readiness checks
export function activate(context: vscode.ExtensionContext) {
  // ... registration code ...
  
  // Delayed initialization
  const initTimeout = setTimeout(async () => {
    // Verify workspace is ready ✅
    if (!vscode.workspace.workspaceFolders?.[0]) {
      console.log('No workspace folder available, skipping initial check');
      return;
    }
    
    // Now safe to run checks ✅
    await refreshChecks();
    
    // ... rest of setup ...
  }, 1500); // Wait 1.5 seconds
  
  // Clean up timeout on deactivation ✅
  context.subscriptions.push(
    new vscode.Disposable(() => clearTimeout(initTimeout))
  );
}
```

### How to avoid it in the future
**Prevention checklist for VS Code extensions:**

1. ✅ **Always delay early activation events**
   - Add timeout for `onStartupFinished` (1-2 seconds)
   - Use `onDidChangeActiveTextEditor` for later activation
   - Consider lazy activation patterns

2. ✅ **Verify workspace readiness**
   ```typescript
   if (!vscode.workspace.workspaceFolders?.[0]) {
     // Handle no workspace scenario
     return;
   }
   ```

3. ✅ **Add loading states to UI components**
   - Show spinners during initialization
   - Provide feedback to users
   - Handle empty states gracefully

4. ✅ **Test edge cases**
   - Cold start (VS Code just opened)
   - No workspace open
   - Quick window reloads
   - Multiple rapid activations

5. ✅ **Use proper cleanup**
   - Add timeouts to subscriptions
   - Clear intervals on deactivation
   - Prevent memory leaks

6. ✅ **Log initialization sequence**
   - Track when components initialize
   - Debug timing issues easily
   - Monitor in production

**General principle:**
> **Never assume external resources are ready immediately after registration. Always verify availability and add appropriate delays for early lifecycle events.**

### Related Documentation
- [VS Code Extension Activation Events](https://code.visualstudio.com/api/references/activation-events)
- [Tree Data Provider API](https://code.visualstudio.com/api/extension-guides/tree-view)
- Fix details: `ACTIVATION_FIX.md`

---

*This ledger helps prevent repeated mistakes by documenting what went wrong and how to avoid it.*
