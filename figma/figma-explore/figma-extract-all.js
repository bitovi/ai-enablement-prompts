#!/usr/bin/env node

/**
 * Figma Full Component Extractor
 * 
 * Extracts all components from a Figma file with full details in batched requests.
 * Combines listing + detail fetching into one efficient operation.
 * 
 * Usage:
 *   node figma-extract-all.js <figmaFileUrl> [options]
 * 
 * Options:
 *   --list-only        List components only (1 API call, no details)
 *   --output <dir>     Output directory for JSON files (default: .figma-components)
 *   --batch-size <n>   Number of components per batch request (default: 30)
 *   --delay <ms>       Delay between batch requests in ms (default: 1000)
 * 
 * Environment:
 *   FIGMA_ACCESS_TOKEN - Figma personal access token (required)
 * 
 * Output:
 *   - figma-components-index.json  - Summary of all components
 *   - <component-name>.json        - Detailed evidence for each component
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_BATCH_SIZE = 30;  // Figma recommends keeping batches reasonable
const DEFAULT_DELAY_MS = 1000;  // 1 second between batches to avoid rate limits
const DEFAULT_OUTPUT_DIR = '.temp/figma-explore';

// Modes
const MODE_FULL = 'full';      // List + fetch details
const MODE_LIST = 'list';      // List only (1 API call)

// ============================================================================
// Utilities
// ============================================================================

function parseFileKey(input) {
  if (!input) return null;
  if (!input.includes('/')) return input;
  
  const designMatch = input.match(/figma\.com\/design\/([^\/]+)/);
  if (designMatch) return designMatch[1];
  
  const fileMatch = input.match(/figma\.com\/file\/([^\/]+)/);
  if (fileMatch) return fileMatch[1];
  
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    fileUrl: null,
    fileKey: null,
    outputDir: DEFAULT_OUTPUT_DIR,
    batchSize: DEFAULT_BATCH_SIZE,
    delayMs: DEFAULT_DELAY_MS,
    mode: MODE_FULL
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' && args[i + 1]) {
      config.outputDir = args[++i];
    } else if (arg === '--batch-size' && args[i + 1]) {
      config.batchSize = parseInt(args[++i], 10);
    } else if (arg === '--delay' && args[i + 1]) {
      config.delayMs = parseInt(args[++i], 10);
    } else if (arg === '--list-only' || arg === '--list') {
      config.mode = MODE_LIST;
    } else if (!arg.startsWith('--')) {
      config.fileUrl = arg;
      config.fileKey = parseFileKey(arg);
    }
  }
  
  return config;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeComponentName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

// ============================================================================
// Figma API
// ============================================================================

async function figmaRequest(pathname, token) {
  const response = await fetch(`https://api.figma.com${pathname}`, {
    method: 'GET',
    headers: { 'X-Figma-Token': token }
  });
  
  if (!response.ok) {
    const text = await response.text();
    
    // Check for rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
    }
    
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed (${response.status})\n` +
        `Verify FIGMA_ACCESS_TOKEN is set correctly.`
      );
    }
    if (response.status === 404) {
      throw new Error(`File not found (404)`);
    }
    throw new Error(`Figma API error: ${response.status} - ${text}`);
  }
  
  return response.json();
}

/**
 * Fetch multiple nodes in a single batched request
 */
async function fetchNodesBatch(fileKey, nodeIds, token) {
  const idsParam = nodeIds.map(id => encodeURIComponent(id)).join(',');
  const data = await figmaRequest(`/v1/files/${fileKey}/nodes?ids=${idsParam}`, token);
  return data.nodes || {};
}

// ============================================================================
// Component Discovery (from file structure)
// ============================================================================

function findComponentSets(node, breadcrumbs = [], results = []) {
  if (!node) return results;
  
  const currentPath = [...breadcrumbs];
  if (node.name && node.type !== 'DOCUMENT') {
    currentPath.push(node.name);
  }
  
  // Skip hidden components
  if (node.name && (node.name.startsWith('_') || node.name.startsWith('.'))) {
    return results;
  }
  
  if (node.type === 'COMPONENT_SET') {
    results.push({
      name: node.name,
      id: node.id,
      variantCount: node.children ? node.children.length : 0,
      description: node.description || '',
      path: currentPath.join(' / ')
    });
  }
  
  if (node.children) {
    for (const child of node.children) {
      findComponentSets(child, currentPath, results);
    }
  }
  
  return results;
}

// ============================================================================
// Component Detail Extraction
// ============================================================================

function extractVariantProperties(componentSet) {
  const variantProps = {};
  
  if (!componentSet.children) return variantProps;
  
  for (const variant of componentSet.children) {
    if (variant.type !== 'COMPONENT') continue;
    
    const parts = variant.name.split(',').map(p => p.trim());
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (key && value) {
        if (!variantProps[key]) {
          variantProps[key] = new Set();
        }
        variantProps[key].add(value);
      }
    }
  }
  
  // Convert sets to arrays and create enum mappings
  const result = {};
  const enumMappings = {};
  
  for (const [key, values] of Object.entries(variantProps)) {
    const valuesArray = Array.from(values);
    result[key] = valuesArray;
    
    // Create normalized enum values for code
    enumMappings[key] = {
      rawKey: key,
      normalizedKey: key.charAt(0).toLowerCase() + key.slice(1),
      values: valuesArray,
      enums: valuesArray.map(v => v.toLowerCase().replace(/\s+/g, '-'))
    };
  }
  
  return { variantProperties: result, variantValueEnums: enumMappings };
}

function extractComponentProperties(componentSet) {
  const props = [];
  
  if (!componentSet.componentPropertyDefinitions) return props;
  
  for (const [name, def] of Object.entries(componentSet.componentPropertyDefinitions)) {
    const cleanName = name.replace(/#\d+:\d+$/, '');
    props.push({
      name: cleanName,
      type: def.type,
      defaultValue: def.defaultValue,
      variantOptions: def.variantOptions
    });
  }
  
  return props;
}

function findTextLayers(node, depth = 0, maxDepth = 5, results = []) {
  if (!node || depth > maxDepth) return results;
  
  if (node.type === 'TEXT') {
    results.push({
      name: node.name,
      type: 'TEXT',
      characters: node.characters || ''
    });
  }
  
  if (node.children) {
    for (const child of node.children) {
      findTextLayers(child, depth + 1, maxDepth, results);
    }
  }
  
  return results;
}

function findSlotLayers(node, depth = 0, maxDepth = 5, results = []) {
  if (!node || depth > maxDepth) return results;
  
  if (node.type === 'FRAME' || node.type === 'INSTANCE') {
    const name = (node.name || '').toLowerCase();
    if (name.includes('slot') || 
        name.includes('content') ||
        name.includes('icon') ||
        name.includes('leading') ||
        name.includes('trailing') ||
        name.includes('children')) {
      results.push({
        name: node.name,
        type: node.type
      });
    }
  }
  
  if (node.children) {
    for (const child of node.children) {
      findSlotLayers(child, depth + 1, maxDepth, results);
    }
  }
  
  return results;
}

function extractComponentEvidence(nodeId, document, fileKey) {
  const { variantProperties, variantValueEnums } = extractVariantProperties(document);
  
  const evidence = {
    schemaVersion: 'figma-component@1',
    componentSetId: nodeId,
    componentName: document.name,
    description: document.description || '',
    url: `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(':', '-')}`,
    variantProperties,
    variantValueEnums,
    componentProperties: extractComponentProperties(document),
    textLayers: [],
    slotLayers: [],
    variants: [],
    totalVariants: 0
  };
  
  if (document.children) {
    evidence.totalVariants = document.children.filter(c => c.type === 'COMPONENT').length;
    
    // Extract from first variant for text/slot layers
    const firstVariant = document.children.find(c => c.type === 'COMPONENT');
    if (firstVariant) {
      evidence.textLayers = findTextLayers(firstVariant);
      evidence.slotLayers = findSlotLayers(firstVariant);
    }
    
    // List all variants
    evidence.variants = document.children
      .filter(c => c.type === 'COMPONENT')
      .map(c => ({
        name: c.name,
        id: c.id
      }));
  }
  
  return evidence;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const config = parseArgs();
  
  if (!config.fileKey) {
    console.error('Usage: node figma-extract-all.js <figmaFileUrl> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --list-only        List components only (1 API call, no details)');
    console.error('  --output <dir>     Output directory (default: .figma-components)');
    console.error('  --batch-size <n>   Components per batch request (default: 30)');
    console.error('  --delay <ms>       Delay between batches in ms (default: 1000)');
    process.exit(1);
  }
  
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    console.error('Error: FIGMA_ACCESS_TOKEN environment variable is required');
    process.exit(1);
  }
  
  try {
    // ========================================================================
    // Step 1: Fetch file structure
    // ========================================================================
    console.error(`\n📁 Fetching Figma file: ${config.fileKey}`);
    
    const fileData = await figmaRequest(`/v1/files/${config.fileKey}`, token);
    
    console.error(`   File: ${fileData.name}`);
    console.error(`   Version: ${fileData.version}`);
    console.error(`   Last Modified: ${fileData.lastModified}`);
    
    // ========================================================================
    // Step 2: Discover all component sets
    // ========================================================================
    const pages = fileData.document.children || [];
    console.error(`\n📑 Pages: ${pages.map(p => p.name).join(', ')}`);
    
    const allComponents = [];
    for (const page of pages) {
      const components = findComponentSets(page);
      for (const comp of components) {
        comp.page = page.name;
        allComponents.push(comp);
      }
    }
    
    console.error(`\n🧩 Found ${allComponents.length} component sets`);
    
    if (allComponents.length === 0) {
      console.error('   No components found in file.');
      process.exit(0);
    }
    
    // ========================================================================
    // List-only mode: output summary and exit
    // ========================================================================
    if (config.mode === MODE_LIST) {
      const listResult = {
        fileName: fileData.name,
        fileKey: config.fileKey,
        fileUrl: `https://www.figma.com/design/${config.fileKey}`,
        version: fileData.version,
        lastModified: fileData.lastModified,
        totalComponents: allComponents.length,
        components: allComponents.map(c => ({
          name: c.name,
          id: c.id,
          page: c.page,
          path: c.path,
          variantCount: c.variantCount,
          url: `https://www.figma.com/design/${config.fileKey}?node-id=${c.id.replace(':', '-')}`
        }))
      };
      
      console.error(`\n✅ List complete! (use without --list-only for full extraction)`);
      console.log(JSON.stringify(listResult, null, 2));
      process.exit(0);
    }
    
    // ========================================================================
    // Step 3: Batch fetch component details
    // ========================================================================
    const nodeIds = allComponents.map(c => c.id);
    const batches = [];
    
    for (let i = 0; i < nodeIds.length; i += config.batchSize) {
      batches.push(nodeIds.slice(i, i + config.batchSize));
    }
    
    console.error(`\n📦 Fetching details in ${batches.length} batch(es) of up to ${config.batchSize}...`);
    
    const allNodeData = {};
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.error(`   Batch ${i + 1}/${batches.length}: ${batch.length} components...`);
      
      const batchResults = await fetchNodesBatch(config.fileKey, batch, token);
      Object.assign(allNodeData, batchResults);
      
      // Delay between batches (except for last batch)
      if (i < batches.length - 1) {
        await sleep(config.delayMs);
      }
    }
    
    // ========================================================================
    // Step 4: Extract evidence and write output
    // ========================================================================
    console.error(`\n💾 Writing output to ${config.outputDir}/`);
    
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    const componentIndex = [];
    const usedFilenames = new Set();
    
    for (const component of allComponents) {
      const nodeData = allNodeData[component.id];
      if (!nodeData || !nodeData.document) {
        console.error(`   ⚠️  Skipping ${component.name}: no data returned`);
        continue;
      }
      
      const evidence = extractComponentEvidence(
        component.id,
        nodeData.document,
        config.fileKey
      );
      
      // Generate unique filename
      let filename = normalizeComponentName(component.name);
      let counter = 1;
      while (usedFilenames.has(filename)) {
        filename = `${normalizeComponentName(component.name)}_${counter++}`;
      }
      usedFilenames.add(filename);
      
      // Write individual component file
      const componentPath = path.join(config.outputDir, `${filename}.json`);
      fs.writeFileSync(componentPath, JSON.stringify(evidence, null, 2));
      
      // Add to index
      componentIndex.push({
        name: component.name,
        id: component.id,
        filename: `${filename}.json`,
        page: component.page,
        path: component.path,
        variantCount: evidence.totalVariants,
        url: evidence.url
      });
    }
    
    // Write index file
    const indexData = {
      schemaVersion: 'figma-component-index@1',
      fileName: fileData.name,
      fileKey: config.fileKey,
      fileUrl: `https://www.figma.com/design/${config.fileKey}`,
      version: fileData.version,
      lastModified: fileData.lastModified,
      exportDate: new Date().toISOString(),
      totalComponents: componentIndex.length,
      components: componentIndex
    };
    
    const indexPath = path.join(config.outputDir, 'figma-components-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    
    // ========================================================================
    // Summary
    // ========================================================================
    console.error(`\n✅ Complete!`);
    console.error(`   Components extracted: ${componentIndex.length}`);
    console.error(`   Index file: ${indexPath}`);
    console.error(`   Component files: ${config.outputDir}/*.json`);
    
    // Output index to stdout for piping
    console.log(JSON.stringify(indexData, null, 2));
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
