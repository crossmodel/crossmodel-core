---
name: build-verification
description: "Verify CI/CD build passes after commits and fix any compilation errors. Use after implementation skills commit code to ensure builds stay green."
---

# Build Verification Skill

## When to Use

Use this skill:
- **Automatically after implementation skills** commit and push code
- When CI/CD builds fail due to compilation errors
- To ensure code quality before PR review
- As a safety net for missed build verification steps

**Trigger:** Should be invoked automatically after any skill commits code.

## Prerequisites

- Code has been committed and pushed to a feature branch
- CI/CD workflow is configured to run on the branch
- GitHub CLI (`gh`) is available (or API access)

## Input Requirements

- Branch name where code was pushed
- Repository name
- Recent commit SHA (optional, can get from git log)

## Process

### 1. Wait for CI/CD to Start

After code is pushed, CI/CD takes time to start.

```bash
# Wait 10 seconds for GitHub to register the push
sleep 10

# Check if CI/CD run exists for the latest commit
LATEST_COMMIT=$(git rev-parse HEAD)
echo "Checking CI/CD for commit: $LATEST_COMMIT"
```

### 2. Monitor Build Status

**Option A: Using GitHub API (if gh CLI available)**
```bash
# Get the workflow run for the current branch
gh run list --branch $(git branch --show-current) --limit 1 --json status,conclusion,databaseId

# Watch the run (blocks until complete)
RUN_ID=$(gh run list --branch $(git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID
```

**Option B: Polling approach**
```bash
# Poll every 30 seconds for status
while true; do
    STATUS=$(gh run list --branch $(git branch --show-current) --limit 1 --json status --jq '.[0].status')
    if [ "$STATUS" = "completed" ]; then
        break
    fi
    echo "Build status: $STATUS (waiting...)"
    sleep 30
done
```

### 3. Check Build Result

```bash
# Get conclusion (success, failure, cancelled)
CONCLUSION=$(gh run list --branch $(git branch --show-current) --limit 1 --json conclusion --jq '.[0].conclusion')

if [ "$CONCLUSION" = "success" ]; then
    echo "✅ Build passed!"
    exit 0
elif [ "$CONCLUSION" = "failure" ]; then
    echo "❌ Build failed - analyzing errors..."
else
    echo "⚠️  Build $CONCLUSION - may need investigation"
    exit 1
fi
```

### 4. Fetch Build Logs and Errors

When build fails, retrieve the error logs:

```bash
# Get the run ID
RUN_ID=$(gh run list --branch $(git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId')

# View the log
gh run view $RUN_ID --log

# Or download logs to analyze
gh run view $RUN_ID --log > build-errors.log
```

### 5. Analyze Compilation Errors

Parse the build log for TypeScript errors:

```bash
# Extract TypeScript compilation errors
grep -E "error TS[0-9]+:" build-errors.log

# Common error patterns:
# - TS2305: Module has no exported member
# - TS2339: Property does not exist on type
# - TS2304: Cannot find name
# - TS2307: Cannot find module
```

**Categorize errors:**
- **Import errors** (TS2305, TS2307): Wrong import paths or missing exports
- **Type errors** (TS2339, TS2741): Type mismatches, missing properties
- **Reference errors** (TS2304): Undefined variables or types

### 6. Fix Errors Systematically

For each error category:

#### A. Import Errors (TS2305/TS2307)

```typescript
// Error: Module '@eclipse-glsp/client' has no exported member 'ArgsUtil'

// Fix: Search codebase for correct import location
// Use Grep to find where the symbol is actually exported
```

**Process:**
1. Identify missing symbol from error message
2. Search codebase: `grep -r "export.*SymbolName" packages/`
3. Correct the import path
4. Verify symbol exists in that module

#### B. Type Errors (TS2339)

```typescript
// Error: Property 'args' does not exist on type 'SNodeImpl'

// Fix: Use type guard
import { hasArgs } from '@eclipse-glsp/client';
if (hasArgs(node)) {
    // Now node.args is accessible
}
```

**Process:**
1. Identify the property access causing error
2. Check if type guard exists (hasArgs, isAstNode, etc.)
3. Apply type guard before property access
4. Or cast to correct type if appropriate

#### C. Missing Dependencies

```typescript
// Error: Cannot find module 'some-package'

// Fix: Install missing dependency
yarn add some-package
```

### 7. Commit and Push Fixes

After fixing errors:

```bash
# Stage fixed files
git add <fixed-files>

# Commit with clear message
git commit -m "fix: resolve TypeScript compilation errors

Fixed:
- error TS2305: Corrected import path for X
- error TS2339: Added type guard for Y property

Addresses build failures in CI/CD run #<run-id>"

# Push fixes
git push -u origin <branch-name>
```

### 8. Verify Fix (Recursive)

After pushing fixes, **repeat the process from Step 1**:
- Wait for new CI/CD run
- Monitor status
- If still failing, analyze new errors and fix
- Continue until build is green ✅

**Maximum iterations:** 3 attempts
- If build still fails after 3 fix cycles, report to user for manual intervention

## Output

- **Success:** CI/CD build passing (green check)
- **Fixed errors:** List of errors fixed
- **Commits made:** Fix commits pushed to branch
- **Build URL:** Link to passing CI/CD run

## Handoff

After successful verification:
- **To:** `user-story-orchestrator` (for final coordination)
- **To:** User (if manual intervention needed after 3 attempts)

## Error Categories and Solutions

### Common Frontend/Backend Confusion

| Error Pattern | Cause | Solution |
|--------------|-------|----------|
| `ArgsUtil` not found in `@eclipse-glsp/client` | Server-only utility used in frontend | Use `hasArgs()` type guard instead |
| `Property 'args' does not exist` | Direct property access without guard | Apply `hasArgs(node)` before accessing |
| `Cannot find module '@crossmodel/server'` | Wrong import path | Use relative paths or check package.json |

### Type Guard Patterns

```typescript
// For args access
import { hasArgs } from '@eclipse-glsp/client';
if (hasArgs(element)) {
    const value = element.args.myKey;
}

// For AST nodes (Langium)
import { isAstNode } from 'langium';
if (isAstNode(obj)) {
    const type = obj.$type;
}

// For references
import { isReference } from 'langium';
if (isReference(value)) {
    const target = value.ref;
}
```

## Retry Strategy

```
Attempt 1: Fix all errors found in initial build
  ↓
  Push fixes → Wait for build
  ↓
Attempt 2: Fix any remaining/new errors
  ↓
  Push fixes → Wait for build
  ↓
Attempt 3: Final attempt at fixes
  ↓
  Push fixes → Wait for build
  ↓
If still failing: Escalate to user with full error report
```

## Example Workflow

**Scenario:** Frontend implementation committed code with ArgsUtil import error

```bash
# 1. Wait for CI/CD
sleep 10

# 2. Monitor build
gh run watch $(gh run list --branch feature-branch --limit 1 --json databaseId --jq '.[0].databaseId')

# 3. Build failed - fetch errors
gh run view --log | grep "error TS"
# Output: error TS2305: Module '@eclipse-glsp/client' has no exported member 'ArgsUtil'

# 4. Analyze error
# - TS2305: Import error
# - ArgsUtil doesn't exist in frontend package
# - Need to use hasArgs instead

# 5. Fix error
# - Read file
# - Remove ArgsUtil import
# - Add hasArgs import
# - Replace ArgsUtil.getBoolean with hasArgs guard

# 6. Commit fix
git add packages/glsp-client/src/browser/views.tsx
git commit -m "fix: use hasArgs instead of ArgsUtil in frontend"
git push

# 7. Repeat monitoring
# (Build passes on second attempt)

# 8. Report success
echo "✅ Build verification complete - all errors fixed"
```

## Monitoring Commands

```bash
# Check latest workflow run status
gh run list --branch $(git branch --show-current) --limit 1

# Watch run in real-time
gh run watch <run-id>

# View logs for failed run
gh run view <run-id> --log

# View logs for specific job
gh run view <run-id> --job <job-id> --log

# Get run conclusion
gh run view <run-id> --json conclusion --jq '.conclusion'
```

## Integration with Other Skills

**Recommendation:** User-story-orchestrator should automatically invoke build-verification after:
- frontend-implementation commits
- backend-glsp-server commits
- backend-language-server commits
- backend-model-server commits

**Pattern:**
```
Implementation Skill
  ↓
  Commits & pushes code
  ↓
Build Verification Skill (automatic)
  ↓
  Monitors CI/CD
  ↓
  Fixes errors if needed
  ↓
  Returns success/failure
  ↓
Continue workflow or escalate
```

## Limitations

- **No local build:** Cannot run `yarn build` if dependencies aren't installed
- **Network dependencies:** Relies on GitHub API and CI/CD availability
- **Timing:** CI/CD may be slow; need appropriate wait times
- **Complexity:** Can only fix compilation errors, not logic bugs

## Best Practices

1. **Start monitoring early:** Don't wait too long after push
2. **Parse logs carefully:** Extract only relevant error messages
3. **Fix one category at a time:** Don't mix import fixes with type fixes
4. **Verify each fix:** Ensure fix is correct before committing
5. **Clear commit messages:** Explain what was fixed and why
6. **Limit attempts:** Don't loop infinitely; escalate after 3 tries
7. **Preserve context:** Keep track of previous errors to avoid regressions

## Troubleshooting

**Issue:** CI/CD run not found
- Wait longer (30-60 seconds) after push
- Check branch name is correct
- Verify CI/CD is configured for this branch

**Issue:** Cannot parse error logs
- Errors may be in different format
- Try different grep patterns
- Download full log and analyze manually

**Issue:** Fixes don't resolve errors
- New errors may be introduced by fixes
- Check if fix actually addresses root cause
- May need different approach (escalate to user)

**Issue:** gh CLI not available
- Fall back to manual instructions for user
- Provide direct links to CI/CD runs
- Ask user to paste error logs

---

**Remember:** This skill is a safety net, not a replacement for proper build verification during development. Always run builds locally before committing!
