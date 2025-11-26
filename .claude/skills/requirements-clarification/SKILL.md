---
name: requirements-clarification
description: "Clarify and capture all requirements for user stories through interactive Q&A. ALWAYS use this skill FIRST when implementing any user story or backlog item. This ensures specifications are unambiguous before implementation."
---

# Requirements Clarification Skill

## When to Use

**ALWAYS use this skill FIRST** when:
- User requests implementation of a user story, backlog item, or feature
- User mentions a ticket ID (e.g., "CM-123", "Issue #45")
- User asks to "add", "implement", "fix", or "enhance" a feature
- Any task that requires code changes to the repository

**This is the ENTRY POINT for all development work.**

## Prerequisites

- User has provided a user story, feature request, or bug description
- Access to `.claude/CLAUDE.md` for architecture understanding

## Input Requirements

- User story text or ticket description
- Any additional context the user provides

## Process

### 1. Initial Analysis (Silent)
Read the user story and identify:
- What is clearly specified
- What is ambiguous or missing
- Which components might be affected (frontend/backend/both)
- Potential edge cases

### 2. Interactive Clarification (CRITICAL)

Ask clarifying questions **one at a time** (max 2-3 questions per round). Focus on:

**Functional Scope:**
- Which specific components are affected?
  - Frontend only (glsp-client, form-client, UI components)?
  - Backend only (language-server, glsp-server, model-server)?
  - Both frontend and backend?
- What is the exact behavior requested?
- Are there multiple interpretation paths? Which is correct?

**Data Flow & Integration:**
- How should data flow between components?
- Which backend service handles the operation (LSP, GLSP, or Model server)?
- Does this affect the document store?
- Do changes need to propagate to all perspectives (diagram, form, code)?

**UI/UX Details (if frontend involved):**
- Where should UI elements appear?
- What user interactions trigger the behavior?
- How should validation errors be displayed?
- Should changes be visible in diagram view, form view, or both?

**Edge Cases & Error Scenarios:**
- What happens with invalid input?
- How to handle concurrent edits (multi-client scenarios)?
- What if dependencies are missing?
- Performance considerations for large models?

**Acceptance Criteria:**
- What defines "done" for this story?
- How can this be tested?
- Are there specific test scenarios to cover?

### 3. Progressive Disclosure

After each round of answers:
- Summarize what you've learned
- Ask the next set of questions
- Build up the complete picture iteratively

**Do NOT overwhelm the user with 10+ questions at once.**

### 4. Component Breakdown

Once requirements are clear, determine:
- **Frontend changes needed:** Which packages (glsp-client, form-client, etc.)?
- **Backend changes needed:** Which server (language-server, glsp-server, model-server)?
- **Interface contracts needed:** Are new RPC endpoints required?
- **Test scenarios:** What integration tests are needed?

### 5. Create Specification Document

Generate a comprehensive specification in `.claude/specs/TICKET-ID-specification.md`:

**Template:**
```markdown
# [TICKET-ID]: [Title]

## User Story
[Original user story text]

## Functional Requirements
1. [Clear, testable requirement]
2. [Clear, testable requirement]
...

## Technical Requirements

### Components Affected
- **Frontend:** [List packages: glsp-client, form-client, etc.]
- **Backend:** [List servers: language-server, glsp-server, model-server]

### Data Flow
[Describe how data flows between components]
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant DocumentStore
    participant Backend
    [Add specific flow]
```

### Integration Points
- [RPC endpoints needed]
- [Document store changes]
- [Notification handling]

## Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] [Multi-client sync verified]
- [ ] [All perspectives updated correctly]

## Edge Cases & Error Handling
1. **[Edge case]:** [How to handle]
2. **[Error scenario]:** [Expected behavior]

## Test Scenarios

### Unit Tests
- [Test case 1]
- [Test case 2]

### Integration Tests
- [Cross-component test 1]
- [Multi-client test 2]

### E2E Tests
- [User flow test 1]

## Implementation Notes
[Any architecture-specific considerations]
[References to existing patterns in codebase]

## Dependencies
[Any external dependencies or prerequisites]

## Estimated Complexity
- [ ] Small (single component, no integration)
- [ ] Medium (multiple components, interface contract needed)
- [ ] Large (significant architecture changes)

## Next Steps
[Which skills will be called next: user-story-orchestrator]
```

### 6. Get User Approval

After creating the specification:
1. Show the user a summary of the specification
2. Ask: "Does this specification accurately capture all requirements? Are there any missing details or corrections needed?"
3. Wait for user confirmation
4. If changes needed, update the specification
5. Only proceed when user explicitly approves

## Output

- **File:** `.claude/specs/TICKET-ID-specification.md`
- **Format:** Markdown with clear sections
- **Content:** Complete, unambiguous requirements ready for implementation

## Handoff

Once user approves the specification:
- Inform user: "Requirements clarification complete. The specification is saved at `.claude/specs/TICKET-ID-specification.md`."
- **Next skill:** `user-story-orchestrator` (will be invoked automatically to coordinate implementation)

## Context Scope

**Focus on:**
- Understanding user intent
- Clarifying ambiguities
- Documenting requirements
- Identifying affected components

**Do NOT:**
- Write code during this phase
- Make implementation decisions yet
- Jump to solutions before requirements are clear
- Assume anything - always ask if uncertain

## Example Interaction

**User:** "Implement CM-123: Add validation for circular entity relationships"

**Skill (Round 1):**
"I'm clarifying the requirements for CM-123. Let me ask a few questions:

1. Should this validation detect circular relationships at the time of editing (real-time) or when saving the model?
2. Should circular relationship errors be shown in the diagram view, form view, text editor, or all three?"

**User:** "Real-time, and show in all views."

**Skill (Round 2):**
"Got it. A couple more questions:

1. What defines a circular relationship? For example:
   - Entity A → Entity B → Entity A (2-hop)
   - Longer chains like A → B → C → A (3-hop)
   - Should we detect both or set a max depth?

2. When a circular relationship is detected, should it:
   - Prevent the relationship from being created?
   - Allow it but show a warning?
   - Mark it as an error in the problems panel?"

**User:** "Detect all depths, prevent creation with clear error message."

**Skill:**
"Perfect! I now have enough information. Creating specification document..."

[Creates specification in .claude/specs/CM-123-specification.md]

"Specification created. Here's a summary:
- Real-time validation when creating entity relationships
- Detect circular references at any depth
- Block creation and show error in diagram, form, and LSP diagnostics
- Requires changes to:
  - Backend (language-server validator)
  - Frontend (glsp-client and form-client error display)

Does this accurately capture the requirements?"

**User:** "Yes, looks good!"

**Skill:** "Great! Requirements clarification complete. Handing off to user-story-orchestrator for implementation planning."

## Tips for Effective Clarification

1. **Ask open-ended questions** for complex topics
2. **Offer multiple-choice options** when paths are clear
3. **Provide examples** to illustrate ambiguities
4. **Reference existing features** in CrossModel to anchor discussions
5. **Validate understanding** by summarizing back to the user
6. **Don't assume technical knowledge** - explain architecture when needed
7. **Be patient** - better to ask one more question than implement the wrong thing

## Architecture-Specific Questions to Consider

- Does this change affect the Langium grammar? (→ language-server)
- Does this need visual representation? (→ glsp-server + glsp-client)
- Does this need form-based editing? (→ model-server + form-client)
- Do multiple perspectives need updates? (→ interface contract needed)
- Does this require document store modifications? (→ careful coordination)
- Will multiple clients need notification? (→ notification handling)

---

**Remember:** This skill sets the foundation for the entire implementation. Taking time to clarify properly prevents costly rework later.
