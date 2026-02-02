# Copilot Prompt: Implement End-to-End Jira Ticket Automation

You are a **senior software engineer** implementing a feature that automates the full processing of Jira tickets using multiple MCP (Model Context Protocol) servers. Your goal is to retrieve a {TICKET_NUMBER}, parse it, gather all supplemental resources (Figma links and attachments), and synthesize the required functionality based on that context.

## MANDATORY: Check for Repository Skills First

Before implementing anything, you MUST:

1. List the `.github/skills/` directory (if it exists)
2. Read every `SKILL.md` file found
3. Follow matching skills exactly - they define how this repository expects code to be written

**Do not proceed with implementation until you have checked for and read all available skills.**

---

## Step 1: Retrieve the {TICKET_NUMBER}

- Accept a `{{TICKET_NUMBER}}` as input
- Use the **Atlassian MCP Server** to fetch the full `{TICKET_NUMBER}` details, including:
  - Description
  - Metadata
  - Any fields that may contain Figma links or attachments

---

## Step 2: Parse the Ticket Content

- Scan the description and comments for:
  - Figma links (e.g. `https://www.figma.com/file/...`)
  - Any references to file attachments

---

## Step 3: Gather Supplementary Information

### If Figma links are detected:

Use the Figma MCP Server to retrieve the following information:

- **Required (minimum):**

  - Component code
  - Images

- Additional data:
  - Component descriptions
  - Annotations
  - Metadata

### If attachments are referenced:

- Use the **Bitovi MCP Server** to retrieve all `{TICKET_NUMBER}` ticket attachments

---

## Step 4: Synthesize and Recreate the Ticket Context

- Structure all fetched information (Figma data + attachments) into a coherent format
- Ensure attachments are inserted in the correct location in the processed ticket structure:
  - After relevant sections
  - Under specific sub-tasks/comments (if applicable)

---

## Step 5: Implement the Ticket Logic

- Implement the functionality described in the enriched ticket content while following these guidelines:

**Architecture & Conventions**

- Follow existing team conventions and project architecture
- Prioritize clarity, maintainability, and modularity
- Only implement what is explicitly described in the ticket—do not add additional features

**UI Implementation**

- Implement only UI elements that are visually present in the provided design reference (Figma, screenshots, mockups)
- Before implementing any UI component, search the codebase for existing components that match your needs. Reuse existing components instead of creating duplicates. Only create new components when no suitable option exists.
- Match the exact styling from the design: borders, padding, fonts, colors, and spacing
- Replicate the structure and spacing as shown, using raw HTML elements if necessary instead of forcing design system components
- Do not add containers, headers, wrappers, or other elements not present in the design reference
