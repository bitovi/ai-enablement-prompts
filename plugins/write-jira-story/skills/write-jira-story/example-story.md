# Example: Complete Story Output

This is an example of the complete output format for the `write-jira-story` skill.
Use this as a reference for structure, formatting, Gherkin style, and scope markers.

---

As a support agent,
- __I want__ to upvote or downvote comments on a case,
- __so that__ the most helpful comments are surfaced to the top.

## Supporting Artifacts

- **Figma**: [🎨 Case Details Desktop](https://www.figma.com/design/abc123?node-id=12-34) | [🎨 Mobile](https://www.figma.com/design/abc123?node-id=56-78)
- **Confluence**: [Comment Voting Spec](https://myco.atlassian.net/wiki/spaces/PROD/pages/123456)
- **Epic**: [PROJ-100](https://myco.atlassian.net/browse/PROJ-100): Case Activity Feed Improvements

<details>
<summary>Scope Analysis</summary>

### Voting Interactions
- ☐ **Upvote/Downvote buttons**: Teal thumbs-up and red/orange thumbs-down icons per comment — [Case Details Desktop](https://www.figma.com/design/abc123?node-id=12-34)
- ☐ **Vote count display**: Count shown next to each button; hidden when count is 0 — [Case Details Desktop](https://www.figma.com/design/abc123?node-id=12-34)
- ☐ **Toggle behavior**: Clicking the active vote button again removes the vote — [Mobile](https://www.figma.com/design/abc123?node-id=56-78)
- ☐ **Switch vote direction**: Clicking the opposite button removes the current vote and applies the new one in one action — [Case Details Desktop](https://www.figma.com/design/abc123?node-id=12-34)
- ✅ **Comment list rendering**: Already implemented in PROJ-98

### Out of Scope
- ❌ **Vote history / audit log**: No design for this, not mentioned in epic
- ❌ **Voting on nested replies**: Designs only show voting on top-level comments
- ❓ **Vote persistence across sessions**: Design shows live count but spec doesn't clarify if votes are user-specific or anonymous
- 💬 **Can users vote on their own comments?** → No, per Jira comment from @jane.doe: "Self-voting should be disabled, same as the existing reaction feature"

</details>

## Acceptance Criteria

**GIVEN** I am viewing comments on a case (desktop or mobile):

[View Case Details Desktop in Figma](https://www.figma.com/design/abc123?node-id=12-34)

- **WHEN** I click the thumbs-up icon on a comment, **THEN**
  - The thumbs-up icon highlights in teal (active state)
  - The thumbs-down icon remains grey
  - The upvote count increments by 1

- **WHEN** I click the thumbs-down icon on a comment, **THEN**
  - The thumbs-down icon highlights in red/orange (active state)
  - The thumbs-up icon remains grey
  - The downvote count increments by 1

  [View downvoted state in Figma](https://www.figma.com/design/abc123?node-id=56-78)

**GIVEN** I have already upvoted a comment:

- **WHEN** I click the thumbs-down icon, **THEN**
  - My upvote is removed (thumbs-up returns to grey, count decrements)
  - The downvote is applied in the same action (thumbs-down highlights, count increments)

- **WHEN** I click the thumbs-up icon again, **THEN**
  - My upvote is removed
  - The thumbs-up returns to grey and the count decrements by 1

**GIVEN** a comment has 0 votes on a button:

- **WHEN** I view the comment, **THEN**
  - No count number appears next to that button
  - The button icon remains visible and clickable

**GIVEN** I am the author of a comment:

- **WHEN** I view my own comment, **THEN**
  - The upvote and downvote buttons are disabled or hidden
  - I cannot vote on my own comment
