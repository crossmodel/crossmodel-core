# Testing Guide: External Entity Icon Feature

## Feature Overview
Visual indicator (Windows-style shortcut arrow) appears in the bottom-left corner of entity nodes that reference entities from other models or npm packages.

## Affected Diagrams
- **System Diagrams** - All entity nodes checked for external references
- **Mapping Diagrams** - Target entity nodes checked for external references

---

## Prerequisites for Testing

### 1. Build the Application
```bash
cd /home/user/crossmodel-core
yarn install
yarn build
```

### 2. Start the Application
**Browser version:**
```bash
yarn build:browser
yarn start:browser
# Open http://localhost:3000
```

**Electron version:**
```bash
yarn build:electron
yarn start:electron
```

---

## Test Scenarios

### Test 1: System Diagram with External Entities

**Setup:**
1. Create workspace with multiple entity files:
   - `model-a.entity` - Contains `EntityA`
   - `model-b.entity` - Contains `EntityB`
   - `system.system` - System diagram referencing both entities

**Expected Behavior:**
- Open `system.system` in diagram view
- `EntityA` should show shortcut arrow icon (external to system.system)
- `EntityB` should show shortcut arrow icon (external to system.system)
- Icon positioned in bottom-left corner
- Icon visible at all zoom levels

**Verification:**
```
✓ Arrow icon visible on external entities
✓ No icon on entities from the same file
✓ Icon positioned correctly (5px from left, 20px from bottom)
✓ Icon scales with zoom
```

---

### Test 2: System Diagram with Local Entities

**Setup:**
1. Create single entity file with diagram:
   - `model.entity` - Contains `LocalEntity` and inline system diagram

**Expected Behavior:**
- Open system diagram in diagram view
- `LocalEntity` should NOT show shortcut arrow icon (local entity)

**Verification:**
```
✓ No icon on local entities
✓ Only entities from other files show icon
```

---

### Test 3: Mapping Diagram with External Target Entities

**Setup:**
1. Create mapping with external target:
   - `source.entity` - Source entities
   - `target.entity` - Target entities
   - `mapping.mapping` - Mapping from source to target

**Expected Behavior:**
- Open `mapping.mapping` in diagram view
- Target entities from `target.entity` should show shortcut arrow icon
- Source objects may or may not show icon (depending on implementation)

**Verification:**
```
✓ Arrow icon visible on external target entities
✓ Icon positioned correctly in mapping diagram
✓ Icon doesn't interfere with mapping edges
```

---

### Test 4: NPM Package Entities

**Setup:**
1. Install workspace with npm dependencies containing entities
2. Reference entities from npm packages in diagrams

**Expected Behavior:**
- Entities from npm packages show shortcut arrow icon
- Same visual treatment as workspace file entities

**Verification:**
```
✓ NPM package entities show icon
✓ No visual distinction between workspace vs npm (same icon)
```

---

### Test 5: Zoom Levels

**Setup:**
1. Open diagram with external entities
2. Test different zoom levels: 50%, 100%, 200%, 400%

**Expected Behavior:**
- Icon remains visible at all zoom levels
- Icon scales proportionally with entity node
- Icon maintains position relative to node bounds

**Verification:**
```
✓ Icon visible at 50% zoom
✓ Icon visible at 100% zoom
✓ Icon visible at 200% zoom
✓ Icon visible at 400% zoom
✓ Proportional scaling maintained
```

---

### Test 6: Entity Selection and Hover States

**Setup:**
1. Open diagram with external entities
2. Select an external entity
3. Hover over an external entity

**Expected Behavior:**
- Icon remains visible when entity is selected
- Icon remains visible when entity is hovered
- Icon doesn't interfere with selection border
- Icon doesn't interfere with hover feedback

**Verification:**
```
✓ Icon visible when entity selected
✓ Icon visible when entity hovered
✓ No visual conflicts with selection/hover states
```

---

### Test 7: Entity with Validation Errors

**Setup:**
1. Create entity with validation errors
2. Ensure entity is external reference

**Expected Behavior:**
- Icon visible alongside validation error indicators
- Both icon and error markers coexist without overlap

**Verification:**
```
✓ Icon visible with validation errors
✓ No overlap between icon and error indicators
```

---

### Test 8: Existing Diagrams (Backward Compatibility)

**Setup:**
1. Open existing workspace created before this feature
2. Diagrams should already have external entity references

**Expected Behavior:**
- Icons automatically appear on external entities
- No manual migration needed
- No errors or warnings

**Verification:**
```
✓ Existing diagrams show icons automatically
✓ No migration required
✓ No console errors
```

---

## Manual Verification Checklist

### Visual Appearance
- [ ] Arrow icon resembles Windows shortcut style
- [ ] White background box provides good contrast
- [ ] Black arrow is clearly visible
- [ ] Icon size is appropriate (~15x15px total)
- [ ] Icon position is consistent across entities

### Functional Behavior
- [ ] Icon only appears on external entities
- [ ] Icon does NOT appear on local entities
- [ ] Icon appears in system diagrams
- [ ] Icon appears in mapping diagrams (target entities)
- [ ] Icon scales with entity node
- [ ] Icon visible at all zoom levels

### Edge Cases
- [ ] Unresolved references don't show icon
- [ ] Entities from same file don't show icon
- [ ] Multiple external references handled correctly
- [ ] Large diagrams (50+ entities) perform well

### Cross-Browser (if browser version)
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

---

## Performance Testing

### Large Diagram Test
1. Create diagram with 100+ entities
2. Mix of local and external entities (50/50 split)
3. Monitor rendering performance

**Expected:**
- Smooth rendering
- No lag when zooming
- No performance degradation
- Diagram remains responsive

**Verification:**
```
✓ Diagram renders in < 2 seconds
✓ Zoom operations smooth (no lag)
✓ Selection remains responsive
✓ No memory leaks over time
```

---

## Debugging Tips

### If icons don't appear:

1. **Check browser console for errors:**
   ```javascript
   // Look for TypeScript or rendering errors
   ```

2. **Verify backend flag is set:**
   ```typescript
   // In browser dev tools, inspect GModel
   // Check entity node has: args: { isExternal: true }
   ```

3. **Check document URIs:**
   ```typescript
   // Ensure entity document URI != diagram document URI
   // Both should be absolute URIs (file:// or similar)
   ```

4. **Verify view registration:**
   ```typescript
   // Check that EntityNodeView is registered in diagram configuration
   ```

### If icons appear incorrectly:

1. **Check positioning:**
   - Verify iconX = 5, iconY = node.bounds.height - 20
   - Ensure transform is applied correctly

2. **Check scaling:**
   - Icon should scale with entity node
   - Test at different zoom levels

3. **Check visibility:**
   - Ensure icon is not hidden by other elements
   - Check z-index/rendering order

---

## Expected Console Output

**No errors expected:**
```
✓ No TypeScript compilation errors
✓ No runtime JavaScript errors
✓ No GLSP protocol errors
✓ No SVG rendering warnings
```

**Informational messages OK:**
```
- GLSP server connection established
- Document loaded: file://...
- GModel updated
```

---

## Regression Testing

Ensure existing functionality still works:

- [ ] Entity creation/deletion still works
- [ ] Relationship creation still works
- [ ] Entity editing still works
- [ ] Diagram navigation still works
- [ ] Save/load still works
- [ ] Undo/redo still works
- [ ] Copy/paste still works

---

## Test Result Template

```markdown
## Test Results: External Entity Icon Feature

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Browser/Electron | OS

### Test Scenario Results

| Test | Status | Notes |
|------|--------|-------|
| System diagram with external entities | ✓/✗ | |
| System diagram with local entities | ✓/✗ | |
| Mapping diagram with external targets | ✓/✗ | |
| NPM package entities | ✓/✗ | |
| Zoom levels (50-400%) | ✓/✗ | |
| Selection/hover states | ✓/✗ | |
| Validation errors | ✓/✗ | |
| Existing diagrams | ✓/✗ | |
| Performance (100+ entities) | ✓/✗ | |

### Issues Found
1. [Issue description]
   - **Severity:** Critical/Major/Minor
   - **Reproduction steps:** ...
   - **Expected:** ...
   - **Actual:** ...

### Overall Assessment
- [ ] Feature ready for production
- [ ] Minor issues need fixing
- [ ] Major issues need fixing

### Screenshots
[Attach screenshots showing icon appearance]
```

---

## Quick Smoke Test

For a quick verification, follow these minimal steps:

1. **Build:** `yarn build:browser`
2. **Start:** `yarn start:browser`
3. **Open:** Example workspace at `examples/mapping-example`
4. **Check:** Open any system diagram
5. **Verify:** Entities from different files show arrow icon

**Expected time:** 5-10 minutes

---

## Contact for Issues

If you encounter any issues during testing:
- Check the interface contract: `.claude/docs/interfaces/EXTERNAL-ENTITY-ICON-interface.md`
- Check the specification: `.claude/specs/EXTERNAL-ENTITY-ICON-specification.md`
- Review implementation commits on branch: `claude/explore-skills-feature-01QArv8K2QcuVhsTpTGW1Rg9`
