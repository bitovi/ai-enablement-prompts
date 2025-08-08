# Jira Ticket Automation Prompt Chain

This project provides an AI prompt chain designed to automate the implementation of Jira tickets by retrieving contextual information from multiple sources, including Atlassian, Figma, and internal attachment servers.

## YouTube Overview

[![generate a feature with AI](https://www.bitovi.com/hubfs/thumbnail-play-small.png)](https://www.youtube.com/watch?v=xcoBQaEmuWY)

https://www.youtube.com/watch?v=xcoBQaEmuWY

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

# Getting Started: Setting Up MCP Servers for Generate Feature

Before using the commands and prompts in the `generate-feature` folder, you need to configure three MCP (Model Context Protocol) servers in VS Code. These servers enable automated Jira ticket processing, Figma integration, and attachment handling.

## Required MCP Servers

To successfully run the generate-feature automation, you'll need:

1. **GitHub MCP Server** - For GitHub integration
2. **Atlassian MCP Server** - For retrieving Jira ticket details
3. **Figma MCP Server** - For fetching Figma component data and annotations
4. **Bitovi MCP Server** - For handling ticket attachments

## Setup Instructions

### 1. Install MCP Servers

Visit the official VS Code MCP page for installation instructions: https://code.visualstudio.com/mcp

From there, install the following MCP servers:

1. **GitHub MCP Server** - For GitHub integration
2. **Atlassian MCP Server** - For retrieving Jira ticket details - `https://mcp.atlassian.com/v1/sse`
3. **Figma MCP Server** - For fetching Figma component data and annotations

**Each MCP server will have its own requirements to connect, make sure to review their provided documentation**

### 2. Add Bitovi MCP Server

In addition to the servers from the VS Code MCP page, you'll need to manually configure the Bitovi MCP server, by adding the following to either your user settings `mcp.json` or your workplace's (`.vscode/mcp.json`):

```json
 "bitovi-jira-mcp": {
      "type": "http",
      "url": "jira-mcp-auth-bridge.bitovi.com/mcp"
    }
```

For more information on setting up MCP servers in VSCode check the [docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

## Next Steps

Once your MCP servers are configured, you can proceed to use the automation prompts in the `generate-feature` folder to process Jira tickets with full context from Figma designs and attachments.
