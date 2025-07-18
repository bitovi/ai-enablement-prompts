# Jira Ticket Automation Prompt Chain

This project provides an AI prompt chain designed to automate the implementation of Jira tickets by retrieving contextual information from multiple sources, including Atlassian, Figma, and internal attachment servers.

## Overview

This prompt chain guides an AI agent through a series of structured steps that include:

- Fetching the full content and metadata of a Jira ticket
- Identifying and extracting referenced Figma links and attachments
- Querying external MCP servers for supplementary information
- Organizing and synthesizing the retrieved data into an actionable format
- Using the enriched context to implement the ticket's functionality

This prompt is intended for use in environments where AI agents have access to internal tooling and MCP servers for Jira, Figma, and file attachments.

## Usage

To use this prompt chain, write something similar to the following in Copilot:

```
1. Open the repository on GitHub: https://github.com/bitovi/ai-enablement-prompts.
2. Execute the prompt `writing-code/generate-feature/generate-feature.md`
```

Or simply paste the contents of `./generate-feature.md` into your AI agent.

## Agent Capabilities

The AI agent executing this prompt chain is expected to support the following capabilities:

- Retrieving data from Atlassian/Jira via MCP
- Accessing external files and links (e.g., Figma)
- Reading and parsing ticket descriptions, comments, and metadata
- Organizing structured information from multiple sources
- Writing to local files and folders

## Parameters

This prompt chain expects the following input:

- `{TICKET_NUMBER}` – The Jira ticket identifier to automate (e.g., `ABC-123`)