# figma-explore

Explores a Figma file via the Figma REST API to discover all pages, components, and component sets — useful for files too large for the Figma MCP tools, which require a specific node ID up front.

> Still an active, standalone skill — not yet packaged as an installable plugin.

## What's here

- [`SKILL.md`](./SKILL.md) — the skill definition ([VS Code Agent Skills](https://code.visualstudio.com/docs/copilot/copilot-customization) format)
- [`figma-extract-all.js`](./figma-extract-all.js) — a Node script that discovers and extracts a Figma file's structure via batched REST API calls

## How to run it

1. Set `FIGMA_ACCESS_TOKEN` in your environment or `.env` — needs the `file_content:read` scope. Get one from [Figma's developer settings](https://www.figma.com/developers/api#access-tokens).
2. Make sure you have Node.js 18+ (used for native `fetch`).
3. Either ask your AI agent to explore a Figma URL (it will find and run the script via the skill), or run it directly:
   ```bash
   node figma/figma-explore/figma-extract-all.js <figmaFileUrl> [options]
   ```

Options:

| Option | Description | Default |
|--------|-------------|---------|
| `--list-only` | Quick discovery only (1 API call) | Full extraction |
| `--output <dir>` | Output directory for JSON files | `.temp/figma-explore` |
| `--batch-size <n>` | Components per batch request | 30 |
| `--delay <ms>` | Delay between batches (rate limiting) | 1000 |
