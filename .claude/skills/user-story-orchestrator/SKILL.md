---
name: user-story-orchestrator
description: "Orchestrate complete implementation of user stories based on approved specifications. Coordinates interface contracts, parallel implementation, and testing. Use after requirements-clarification is complete."
---

# User Story Orchestrator Skill

## When to Use

Use this skill when:
- Requirements clarification is complete and approved
- Specification document exists in `.claude/specs/TICKET-ID-specification.md`
- Ready to begin implementation workflow

**Do NOT use this skill:**
- Before requirements are clarified
- For simple questions or exploratory work
- When specification is not yet approved

## Prerequisites

- `.claude/specs/TICKET-ID-specification.md` exists
- User has approved the specification
- Specification clearly identifies affected components

## Input Requirements

- Path to specification document
- Ticket ID

## Process

### 1. Read Specification

Load the specification document from `.claude/specs/TICKET-ID-specification.md` and extract:
- Components affected (frontend/backend)
- Technical requirements
- Integration points
- Dependencies

### 2. Determine Workflow Path

Analyze the specification and choose the appropriate workflow:

#### Path A: Frontend + Backend Changes (REQUIRES INTERFACE CONTRACT)
```
1. Call interface-contract skill
2. Wait for user approval of interface contract
3. Parallel implementation:
   - Call frontend-implementation skill
   - Call appropriate backend skill(s):
     * backend-language-server (LSP, grammar, document store)
     * backend-glsp-server (diagram operations)
     * backend-model-server (form operations)
4. Call testing-integration skill
```

#### Path B: Frontend Only
```
1. Call frontend-implementation skill
2. Call testing-integration skill (if integration tests needed)
```

#### Path C: Backend Only
```
1. Call appropriate backend skill(s):
   - backend-language-server
   - backend-glsp-server
   - backend-model-server
2. Call testing-integration skill (if integration tests needed)
```

### 3. Create Feature Branch

If not already on a feature branch:
```bash
git checkout -b feature/TICKET-ID-short-description
```

Follow naming convention:
- `feature/` for new features
- `fix/` for bug fixes
- Use kebab-case
- Include ticket ID if available

### 4. Coordinate Skill Execution

#### For Path A (Frontend + Backend):

**Step 1 - Interface Contract:**
```
Invoke: interface-contract skill
Input: Specification document path
Output: .claude/docs/interfaces/TICKET-ID-interface.md
Wait: User approval of contract
```

**Step 2 - Parallel Implementation:**
Coordinate simultaneous work on frontend and backend:
```
Parallel Invoke:
  - frontend-implementation skill
  - backend-[language-server|glsp-server|model-server] skill(s)

Monitor: Both skills complete successfully
Verify: Interface contracts are followed
```

**Step 3 - Integration:**
```
Invoke: testing-integration skill
Input: All implementation artifacts
Verify: Cross-component tests pass
```

#### For Path B (Frontend Only):

**Step 1 - Implementation:**
```
Invoke: frontend-implementation skill
Input: Specification document
Output: Frontend changes
```

**Step 2 - Testing (if needed):**
```
If integration tests required:
  Invoke: testing-integration skill
```

#### For Path C (Backend Only):

**Step 1 - Implementation:**
```
Invoke: appropriate backend skill(s)
Input: Specification document
Output: Backend changes
```

**Step 2 - Testing (if needed):**
```
If integration tests required:
  Invoke: testing-integration skill
```

### 5. Ensure Quality Gates

After implementation, verify:
- [ ] All affected perspectives work correctly (diagram, form, code)
- [ ] TypeScript compilation successful (`yarn build`)
- [ ] Linting passes (`yarn lint`)
- [ ] Unit tests pass (`yarn test`)
- [ ] Integration tests pass (if applicable)
- [ ] E2E tests pass (if modified) (`yarn ui-test`)
- [ ] Multi-client scenarios tested
- [ ] Document store sync verified

### 6. Commit Changes

Follow Conventional Commits standard:
```bash
# Feature
git commit -m "feat(scope): add feature description"

# Bug fix
git commit -m "fix(scope): fix bug description"

# Example
git commit -m "feat(validation): add circular relationship detection"
```

Scopes: `glsp-client`, `form-client`, `language-server`, `glsp-server`, `model-server`, `validation`, `ui`, `api`, etc.

### 7. Push and Create PR

```bash
# Push to feature branch
git push -u origin feature/TICKET-ID-description

# Create pull request (if gh CLI available)
gh pr create --title "feat: Feature description" --body "[Auto-generated PR body with summary]"
```

PR body should include:
- Link to specification
- Summary of changes
- Test results
- Screenshots (if UI changes)

### 8. Report Completion

Inform user:
```
Implementation complete for TICKET-ID!

Summary:
- Specification: .claude/specs/TICKET-ID-specification.md
- Interface Contract: .claude/docs/interfaces/TICKET-ID-interface.md (if applicable)
- Branch: feature/TICKET-ID-description
- Changes: [Brief summary]
- Tests: [Pass/Fail status]

Next steps:
- Review the changes
- Test the feature locally (yarn build:browser && yarn start:browser)
- Create pull request (if not already done)
```

## Output

- Working implementation across all affected components
- All tests passing
- Committed changes on feature branch
- Pull request created (optional)
- Summary report for user

## Handoff

After completion:
- **To user:** For code review and PR approval
- **To testing-integration (if issues found):** For additional test coverage

## Context Scope

**Focus on:**
- Coordinating workflow across multiple skills
- Ensuring interface contracts are honored
- Managing parallel execution when possible
- Verifying integration between components
- Quality gates and testing

**Do NOT:**
- Implement code directly (delegate to specialized skills)
- Skip interface contract for cross-component features
- Commit without running tests
- Push to main/master branch

## Decision Logic

```
READ specification
IDENTIFY components (frontend, backend services)

IF (frontend AND backend):
    INVOKE interface-contract
    WAIT FOR approval
    PARALLEL:
        INVOKE frontend-implementation
        INVOKE backend-* (one or more)
    END PARALLEL
    INVOKE testing-integration

ELSE IF (frontend ONLY):
    INVOKE frontend-implementation
    IF integration_tests_needed:
        INVOKE testing-integration

ELSE IF (backend ONLY):
    INVOKE backend-* (one or more)
    IF integration_tests_needed:
        INVOKE testing-integration

END IF

RUN quality gates
COMMIT changes
PUSH to branch
CREATE PR (optional)
REPORT to user
```

## Example Orchestration

**Scenario:** CM-123 requires frontend (glsp-client) + backend (glsp-server) changes

**Orchestration Flow:**

1. **Read Specification:**
   - `.claude/specs/CM-123-specification.md`
   - Identifies: glsp-client + glsp-server affected

2. **Determine Path:** Path A (Frontend + Backend)

3. **Create Branch:**
   ```bash
   git checkout -b feature/CM-123-circular-validation
   ```

4. **Invoke Interface Contract:**
   - Skill creates `.claude/docs/interfaces/CM-123-interface.md`
   - Defines validation request/response types
   - User approves

5. **Parallel Implementation:**
   - **frontend-implementation skill:**
     - Updates diagram validation display
     - Shows error markers on circular relationships
   - **backend-glsp-server skill:**
     - Implements validation logic
     - Adds operation handler
     - Integrates with document store

6. **Integration Testing:**
   - testing-integration skill creates cross-component tests
   - Verifies RPC communication
   - Tests multi-client scenarios

7. **Quality Gates:**
   ```bash
   yarn build      # ✓ Pass
   yarn lint       # ✓ Pass
   yarn test       # ✓ Pass
   ```

8. **Commit:**
   ```bash
   git commit -m "feat(validation): add circular relationship detection

   - Add real-time validation for circular entity relationships
   - Display errors in diagram, form, and text editor
   - Prevent creation of circular references
   - Add integration tests for multi-client scenarios

   Closes: CM-123"
   ```

9. **Push & PR:**
   ```bash
   git push -u origin feature/CM-123-circular-validation
   gh pr create --title "feat(validation): add circular relationship detection"
   ```

10. **Report:**
    ```
    Implementation complete for CM-123!

    Summary:
    - ✓ Interface contract defined and approved
    - ✓ Frontend validation display implemented
    - ✓ Backend validation logic implemented
    - ✓ Integration tests added and passing
    - ✓ All quality gates passed

    Branch: feature/CM-123-circular-validation
    PR: [link]

    You can test locally with:
      yarn build:browser && yarn start:browser
    ```

## Coordination Tips

1. **Monitor parallel execution:** Ensure both skills complete before integration
2. **Interface contract adherence:** Verify implementations match the contract
3. **Fail fast:** If any skill reports errors, stop and address before continuing
4. **Clear communication:** Keep user informed of progress at each phase
5. **Rollback plan:** If integration fails, provide clear next steps

## Common Scenarios

### Scenario 1: Simple Frontend-Only Change
User story: Add tooltip to existing button
- Path B: frontend-implementation only
- No interface contract needed
- Quick turnaround

### Scenario 2: Backend API Addition
User story: Add new validation rule in language server
- Path C: backend-language-server only
- May need frontend update later (separate story)

### Scenario 3: New Feature Across All Components
User story: Add new diagram element type
- Path A: Full workflow
- Interface contract critical
- glsp-client + glsp-server + potentially language-server
- Extensive testing needed

### Scenario 4: Multiple Backend Services
User story: Add entity mapping in both diagram and form
- Path A with multiple backend skills
- glsp-server + model-server
- Complex coordination needed

---

**Remember:** Orchestration is about coordination, not implementation. Delegate to specialized skills and ensure they work together harmoniously.
