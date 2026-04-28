---
name: document-feature
description: Create comprehensive feature requirement documents. Use when asked to document a feature, write feature requirements, or create feature specifications. Includes user stories, functional requirements, data model review, workflows, and edge cases.
---

# Skill: Documenting Features

This skill defines how to create comprehensive, user-focused feature requirement documents.

## What This Skill Does

Creates detailed feature documentation in a `wiki/` directory that:
- Focuses on **user behavior** and **application interactions** (not implementation)
- Reviews and specifies needed **data model changes**
- Documents **workflows**, **edge cases**, and **success criteria**

## When to Use This Skill

Use this skill when:
- Creating a new feature document
- Expanding a brief feature description into full requirements
- Documenting user interactions and expected behaviors
- Reviewing data model adequacy for a feature

**Do NOT use** this skill for:
- Implementation details (tech stack, libraries, architecture)
- Code-level specifications
- API contract definitions

## Feature Document Structure

### File Naming Convention

wiki/features/{ORDER}-{FEATURE_NAME}.md

Examples:
- `001-user-authentication-authorization.md`
- `002-data-import-export.md`

### Required Sections

Every feature document MUST include these sections in order:

#### 1. Header
# Feature {NUMBER}: {Title}
**Status:** {Draft | In Review | Approved}
**Priority:** {1-N}
**Last Updated:** {Date}

#### 2. Overview
- **Value Proposition:** One sentence describing user value
- Brief description (2-3 sentences) of what the feature does

#### 3. User Stories
Format as: ### As a {Role} — I want to {action} so that {benefit}

#### 4. Functional Requirements
Organized by functional area. Focus on observable behaviors.

#### 5. Data Model Review
Review existing model and specify changes needed. Include concrete schema examples.

#### 6. User Workflows
Step-by-step user interactions. Focus on what the user sees and does.

#### 7. Key Error States (Optional)
Document important error states.

#### 8. Dependencies
Upstream (Blockers) and Downstream (Enabled Features).

#### 9. Demo Goals
What should be demonstrable.

#### 10. Out of Scope

#### 11. Open Questions
Behavioral decisions with recommended answers.

## Checklist
- [ ] All required sections present and complete
- [ ] User stories cover all relevant roles
- [ ] Functional requirements are clear
- [ ] Data model reviewed with specific additions documented
- [ ] At least 2-3 complete user workflows documented
- [ ] Key error states documented
- [ ] Demo goals are clear
- [ ] No implementation details included
- [ ] Open questions have recommended answers
