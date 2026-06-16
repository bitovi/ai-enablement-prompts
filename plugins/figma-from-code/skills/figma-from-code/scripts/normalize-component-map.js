#!/usr/bin/env node

/**
 * Normalizes component-map.json names to match Figma naming conventions.
 *
 * Resolves two classes of mismatch between the DOM scanner and Figma:
 *   1. Lucide icons: scanner reads React fiber displayName (canonical),
 *      but Figma uses the codebase import name (may be a legacy alias).
 *   2. SVG asset wrappers: scanner sees the wrapper component name,
 *      but Figma uses Asset/{assetName}.
 *
 * Usage:
 *   node normalize-component-map.js <component-map.json> <icons.json> [--write]
 *
 * Without --write, prints a dry-run report. With --write, updates in place.
 */

const fs = require("fs");
const path = require("path");

const componentMapPath = process.argv[2];
const iconsJsonPath = process.argv[3];
const writeMode = process.argv.includes("--write");

if (!componentMapPath || !iconsJsonPath) {
  console.error(
    "Usage: node normalize-component-map.js <component-map.json> <icons.json> [--write]"
  );
  process.exit(1);
}

const componentMap = JSON.parse(fs.readFileSync(componentMapPath, "utf-8"));
const iconsData = JSON.parse(fs.readFileSync(iconsJsonPath, "utf-8"));

const iconImportNames = new Set(iconsData.icons.map((i) => i.name));
const assetImportNames = new Set(iconsData.assets.map((a) => a.name));

function resolveLucidePackageDir() {
  try {
    const entryFile = require.resolve("lucide-react");
    let dir = path.dirname(entryFile);
    while (dir !== path.parse(dir).root) {
      if (fs.existsSync(path.join(dir, "package.json"))) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
          if (pkg.name === "lucide-react") return dir;
        } catch {
        }
      }
      dir = path.dirname(dir);
    }
    return null;
  } catch {
    return null;
  }
}

function buildLucideAliasMap() {
  const aliasToCanonical = {};
  const canonicalToAlias = {};

  const lucideDir = resolveLucidePackageDir();
  if (!lucideDir) {
    console.warn(
      "Warning: lucide-react package not found — icon alias resolution skipped"
    );
    return { aliasToCanonical, canonicalToAlias };
  }

  try {
    const lucidePath = path.join(lucideDir, "dist/esm/lucide-react.js");
    const content = fs.readFileSync(lucidePath, "utf-8");

    for (const line of content.split("\n")) {
      if (!line.startsWith("export")) continue;
      const match = line.match(/export \{ (.+) \} from/);
      if (!match) continue;

      const names = match[1]
        .split(",")
        .map((s) => s.trim().replace("default as ", ""))
        .filter((n) => !n.includes("Icon") && !n.includes("Lucide"));

      if (names.length >= 2) {
        const canonical = names[0];
        for (let i = 1; i < names.length; i++) {
          aliasToCanonical[names[i]] = canonical;
          if (!canonicalToAlias[canonical]) canonicalToAlias[canonical] = [];
          canonicalToAlias[canonical].push(names[i]);
        }
      }
    }
  } catch {
    console.warn("Warning: could not read lucide-react exports, skipping alias resolution");
  }

  return { aliasToCanonical, canonicalToAlias };
}

const { aliasToCanonical, canonicalToAlias } = buildLucideAliasMap();

function resolveIconName(scannerName) {
  if (iconImportNames.has(scannerName)) return scannerName;

  const aliases = canonicalToAlias[scannerName] || [];
  for (const alias of aliases) {
    if (iconImportNames.has(alias)) return alias;
  }

  return null;
}

function resolveAssetName(scannerName) {
  if (assetImportNames.has(scannerName)) return scannerName;

  for (const assetName of assetImportNames) {
    if (assetName.startsWith(scannerName)) return assetName;
  }

  return null;
}

const renames = [];

function normalizeComponent(comp) {
  const original = comp.name;
  const isLeaf = !comp.children || comp.children.length === 0;

  if (!isLeaf) return;

  const iconMatch = resolveIconName(original);
  if (iconMatch) {
    comp.name = `Icon/${iconMatch}`;
    renames.push({ from: original, to: comp.name, reason: "icon" });
    return;
  }

  const assetMatch = resolveAssetName(original);
  if (assetMatch) {
    comp.name = `Asset/${assetMatch}`;
    renames.push({ from: original, to: comp.name, reason: "asset" });
    return;
  }
}

for (const tier of componentMap.tiers) {
  for (const comp of tier.components) {
    normalizeComponent(comp);
  }
}

function renameInTree(node) {
  const rename = renames.find((r) => r.from === node.name);
  if (rename) node.name = rename.to;
  if (node.children) node.children.forEach(renameInTree);
}

if (componentMap.tree) {
  componentMap.tree.forEach(renameInTree);
}

for (const tier of componentMap.tiers) {
  for (const comp of tier.components) {
    if (comp.children) {
      comp.children = comp.children.map((childName) => {
        const rename = renames.find((r) => r.from === childName);
        return rename ? rename.to : childName;
      });
    }
  }
}

if (renames.length === 0) {
  console.log("No renames needed — all names already match Figma conventions.");
} else {
  console.log(`Normalized ${renames.length} component name(s):\n`);
  for (const r of renames) {
    console.log(`  ${r.from} → ${r.to} (${r.reason})`);
  }
}

if (writeMode) {
  fs.writeFileSync(componentMapPath, JSON.stringify(componentMap, null, 2) + "\n");
  console.log(`\nWrote updated ${componentMapPath}`);

  const summaryPath = path.join(path.dirname(componentMapPath), "discovery-summary.json");

  let existing = null;
  if (fs.existsSync(summaryPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
    } catch {
      existing = null;
    }
  }

  const tiers = componentMap.tiers.map((t) => ({
    tier: t.tier,
    label: t.label || `Tier ${t.tier}`,
    components: t.components.map((c) => c.name),
  }));

  const builtComponents = {};
  const preExistingComponents = {};
  let bothCount = 0;
  let codeOnlyCount = 0;
  let browserOnlyCount = 0;

  for (const t of componentMap.tiers) {
    for (const c of t.components) {
      if (c.figmaNodeId) {
        builtComponents[c.name] = c.figmaNodeId;
        preExistingComponents[c.name] = c.figmaNodeId;
      }
      if (c.source === "both") bothCount++;
      else if (c.source === "code") codeOnlyCount++;
      else if (c.source === "browser") browserOnlyCount++;
    }
  }

  const componentCount = componentMap.tiers.reduce((sum, t) => sum + t.components.length, 0);

  const summary = {
    buildOrder: { tierCount: tiers.length, tiers },
    builtComponents: existing ? Object.assign({}, existing.builtComponents || {}, builtComponents) : builtComponents,
    preExistingComponents,
    preExistingScreens: (componentMap.figma && componentMap.figma.preExistingScreens) || (existing && existing.preExistingScreens) || {},
    componentCount,
    sourceBreakdown: { both: bothCount, codeOnly: codeOnlyCount, browserOnly: browserOnlyCount },
    figma: componentMap.figma || (existing && existing.figma) || null,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  console.log(`Wrote updated ${summaryPath} (${componentCount} components across ${tiers.length} tiers)`);
} else {
  console.log("\nDry run — pass --write to update the file.");
}
