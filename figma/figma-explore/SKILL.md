---
name: figma-explore
description: Explore a Figma file to discover all pages, components, and component sets using the Figma REST API. Use when you need to list components in a Figma file, find component node IDs for Code Connect, or understand the structure of a design file.
---

# Skill: Explore Figma Files

This skill provides scripts to explore Figma files via the REST API, bypassing the limitations of the MCP tools which require a specific node ID.

## When to Use This Skill

- User provides a Figma file URL without a specific node ID
- Need to discover all components in a Figma design system
- Want to find component node IDs for Code Connect setup
- Need to understand the page/component structure of a Figma file

## Prerequisites

1. **FIGMA_ACCESS_TOKEN**: Set in `.env` or environment
   - Get from: https://www.figma.com/developers/api#access-tokens
   - Required scope: `file_content:read`

2. **Node.js**: Version 18+ (for native fetch)

## The Script: `figma-extract-all.js`

A single script that handles both discovery and full extraction with batched API requests.

**Usage:**
```bash
node .github/skills/figma-explore/figma-extract-all.js <figmaFileUrl> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--list-only` | Quick discovery only (1 API call) | Full extraction |
| `--output <dir>` | Output directory for JSON files | `.temp/figma-explore` |
| `--batch-size <n>` | Components per batch request | 30 |
| `--delay <ms>` | Delay between batches (rate limiting) | 1000 |

### Quick Discovery (1 API call)
```bash
node .github/skills/figma-explore/figma-extract-all.js <url> --list-only
```
Outputs JSON with component names, IDs, and URLs to stdout.

### Full Extraction (batched)
```bash
node .github/skills/figma-explore/figma-extract-all.js <url>
```
Writes to `.temp/figma-explore/`:
- `figma-components-index.json` - Summary index
- `<component>.json` - Full evidence per component

### API Call Efficiency

| Mode | 45 Components | API Calls |
|------|---------------|-----------|
| `--list-only` | 1 call | ✅ Instant |
| Full extraction | 1 + ⌈45/30⌉ = 3 calls | ✅ Batched |

## Execution Steps

### Step 1: Verify Environment

Before running the script, ensure the token is available:

```bash
# Check if token is set
source .env 2>/dev/null
[ -n "$FIGMA_ACCESS_TOKEN" ] && echo "Token: set" || echo "Token: missing"
```

If not set:
1. Create token at https://www.figma.com/developers/api#access-tokens
2. Add to `.env`: `FIGMA_ACCESS_TOKEN=figd_...`

### Step 2: Run Extraction

**Quick discovery:**
```bash
source .env && node .github/skills/figma-explore/figma-extract-all.js "<figmaUrl>" --list-only
```

**Full extraction:**
```bash
source .env && node .github/skills/figma-explore/figma-extract-all.js "<figmaUrl>"
```

### Step 3: Use Results

**Index file** (`.temp/figma-explore/figma-components-index.json`):
```json
{
  "fileName": "Obra shadcn/ui",
  "fileKey": "MQUbIrlfuM8qnr9XZ7jc82",
  "totalComponents": 45,
  "components": [
    { "name": "Button", "id": "16:1234", "url": "..." }
  ]
}
```

**Component evidence** (`.temp/figma-explore/button.json`):
```json
{
  "componentSetId": "16:1234",
  "componentName": "Button",
  "variantProperties": { "Size": ["Small", "Large"] },
  "componentProperties": [{ "name": "Disabled", "type": "BOOLEAN" }],
  "textLayers": [{ "name": "Label", "characters": "Button" }],
  "slotLayers": [{ "name": "Icon", "type": "INSTANCE" }]
}
```

### Step 4: Generate Code Connect

Use the evidence files with:
- The `figma-connect-component` skill
- Direct Code Connect generation
- Manual `.figma.tsx` file creation

## Figma REST API Reference

The scripts use these endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/files/:file_key` | Get entire file structure |
| `GET /v1/files/:file_key/nodes?ids=:node_ids` | Get specific node details |
| `GET /v1/files/:file_key/components` | List published components |

## Troubleshooting

### 401/403 Errors
- Token is invalid or expired
- Token doesn't have `file_content:read` scope
- Regenerate at https://www.figma.com/developers/api#access-tokens

### 404 Errors  
- File key is incorrect
- You don't have access to the file
- File has been deleted or moved

### Network Errors
- Check internet connection
- Corporate proxy may need HTTP_PROXY/HTTPS_PROXY set
