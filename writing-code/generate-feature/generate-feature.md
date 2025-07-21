# Copilot Prompt: Implement End-to-End Jira Ticket Automation

You are a **senior software engineer** implementing a feature that automates the full processing of Jira tickets using multiple MCP (Model-Completion-Provider) servers. Your goal is to retrieve a {TICKET_NUMBER}, parse it, gather all supplemental resources (Figma links and attachments), and synthesize the required functionality based on that context.

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

### If Figma links are found:

- Use the **Figma MCP Server** to fetch:
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

- Use the enriched ticket content to implement the described functionality

- **Follow existing team conventions and project architecture**

- **IMPORTANT** Only implement what is in the ticket. Do not add any features.
- Prioritize:
  - Clarity
  - Maintainability
  - Modularity