#!/usr/bin/env node
/**
 * Discover React/Vue/Angular/Svelte components from source code.
 *
 * Two modes:
 *   --discover [--root <dir>]
 *       Auto-detect frontend packages and component directories.
 *       Outputs JSON to stdout for the LLM to present to the user.
 *
 *   --scan <dir1> [dir2...] [--browser-map <path>] [--output <path>] [--exclude <name1,name2>]
 *       Scan given directories for components, merge with browser-discovered
 *       component-map, recompute dependency tiers, write output.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function flag(name) {
  const i = args.indexOf(name);
  return i !== -1;
}

function flagValue(name) {
  const i = args.indexOf(name);
  if (i !== -1 && i + 1 < args.length) return args[i + 1];
  return null;
}

function flagValues(name) {
  const i = args.indexOf(name);
  if (i === -1) return [];
  const vals = [];
  for (let j = i + 1; j < args.length; j++) {
    if (args[j].startsWith('--')) break;
    vals.push(args[j]);
  }
  return vals;
}

const FRONTEND_DEPS = new Set([
  'react', 'react-dom', 'vue', '@vue/runtime-core', 'angular', '@angular/core',
  'svelte', 'next', 'nuxt', 'solid-js', 'preact', 'lit', 'astro',
]);

const COMPONENT_EXTENSIONS = new Set(['.tsx', '.jsx', '.vue', '.svelte']);

const EXCLUDED_PATTERNS = [
  /\.test\./,
  /\.stories\./,
  /\.spec\./,
  /^index\./,
  /^types\./,
  /^use[A-Z]/,
];

const SKIP_DIRS = new Set(['node_modules', '.temp', 'dist', 'build', '.next', '.nuxt', '.git', '.claude']);

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]+$/.test(name);
}

function isComponentFile(filePath) {
  const ext = path.extname(filePath);
  if (!COMPONENT_EXTENSIONS.has(ext)) return false;
  const base = path.basename(filePath);
  const nameWithoutExt = base.replace(ext, '');
  if (!isPascalCase(nameWithoutExt)) return false;
  if (EXCLUDED_PATTERNS.some((p) => p.test(base))) return false;
  return true;
}

function walkDir(dir, excludeBasenames = new Set()) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (excludeBasenames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, excludeBasenames));
    } else if (entry.isFile() && isComponentFile(full)) {
      results.push(full);
    }
  }
  return results;
}

function findPackageJsons(root) {
  const results = [];
  function walk(dir, depth) {
    if (depth > 5) return;
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === 'package.json') {
        results.push(full);
      } else if (entry.isDirectory()) {
        walk(full, depth + 1);
      }
    }
  }
  walk(root, 0);
  return results;
}

function isFrontendPackage(pkgJsonPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const dep of Object.keys(allDeps)) {
      if (FRONTEND_DEPS.has(dep)) return { name: pkg.name || path.basename(path.dirname(pkgJsonPath)), framework: dep };
    }
  } catch {}
  return null;
}

function resolveSourceRoot(pkgDir) {
  const candidates = ['src', 'app', 'lib', 'source'];
  for (const c of candidates) {
    const full = path.join(pkgDir, c);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return full;
  }
  return pkgDir;
}

function findComponentDirs(sourceRoot) {
  const componentFiles = walkDir(sourceRoot);
  const dirCounts = {};
  for (const f of componentFiles) {
    const dir = path.dirname(f);
    const rel = path.relative(sourceRoot, dir);
    const topDir = rel.split(path.sep)[0] || '.';
    if (!dirCounts[topDir]) dirCounts[topDir] = { path: path.join(sourceRoot, topDir), count: 0, subdirs: new Set() };
    dirCounts[topDir].count++;
    const parts = rel.split(path.sep);
    if (parts.length > 1) dirCounts[topDir].subdirs.add(parts[1]);
  }
  return Object.values(dirCounts)
    .filter((d) => d.count >= 3)
    .map((d) => ({ path: d.path, componentCount: d.count, subdirs: [...d.subdirs].sort() }));
}

function resolveAliasBase(scanDirs) {
  for (const dir of scanDirs) {
    let search = dir;
    for (let i = 0; i < 5; i++) {
      const tsconfig = path.join(search, 'tsconfig.json');
      if (fs.existsSync(tsconfig)) {
        try {
          const raw = fs.readFileSync(tsconfig, 'utf-8').replace(/\/\/.*/g, '').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          const cfg = JSON.parse(raw);
          const paths = cfg.compilerOptions?.paths;
          if (paths) {
            for (const [alias, targets] of Object.entries(paths)) {
              if (alias.endsWith('/*') && targets.length > 0) {
                const prefix = alias.slice(0, -2);
                const target = targets[0].replace('/*', '');
                const baseDir = path.resolve(search, cfg.compilerOptions?.baseUrl || '.', target);
                return { prefix, baseDir, tsconfigDir: search };
              }
            }
          }
        } catch {}
      }
      const parent = path.dirname(search);
      if (parent === search) break;
      search = parent;
    }
  }
  return null;
}

// ── Import parsing (adapted from check-prereqs.js) ──

const NAMED_IMPORT_RE = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
const DEFAULT_IMPORT_RE = /import\s+([A-Z][A-Za-z0-9_]+)\s+(?:,\s*\{[^}]*\}\s+)?from\s+['"]([^'"]+)['"]/g;

function parseImports(source, filePath, aliasConfig, componentNameToPath) {
  const deps = new Set();
  const fileDir = path.dirname(filePath);

  function resolveImportOrigin(origin) {
    if (origin.startsWith('.')) {
      return path.resolve(fileDir, origin);
    }
    if (aliasConfig && origin.startsWith(aliasConfig.prefix + '/')) {
      const rest = origin.slice(aliasConfig.prefix.length + 1);
      return path.resolve(aliasConfig.baseDir, rest);
    }
    return null;
  }

  function tryMatchComponent(names, origin) {
    const resolved = resolveImportOrigin(origin);
    if (!resolved) return;

    for (const name of names) {
      if (!isPascalCase(name)) continue;
      if (componentNameToPath.has(name)) {
        deps.add(name);
      }
    }
  }

  let m;
  const src = source.toString();

  const namedRe = new RegExp(NAMED_IMPORT_RE.source, 'g');
  while ((m = namedRe.exec(src))) {
    const origin = m[2];
    const names = m[1]
      .split(',')
      .map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0])
      .filter(Boolean);
    tryMatchComponent(names, origin);
  }

  const defaultRe = new RegExp(DEFAULT_IMPORT_RE.source, 'g');
  while ((m = defaultRe.exec(src))) {
    const origin = m[2];
    const name = m[1];
    tryMatchComponent([name], origin);
  }

  return [...deps];
}

// ── Topological sort for tier computation ──

function computeTiers(components) {
  const nameSet = new Set(components.map((c) => c.name));
  const adjList = new Map();
  for (const c of components) {
    const filteredDeps = (c.codeDependencies || []).filter((d) => nameSet.has(d));
    adjList.set(c.name, new Set(filteredDeps));
  }

  const tiers = [];
  const assigned = new Set();

  while (assigned.size < nameSet.size) {
    const tier = [];
    for (const name of nameSet) {
      if (assigned.has(name)) continue;
      const deps = adjList.get(name) || new Set();
      const unresolved = [...deps].filter((d) => !assigned.has(d));
      if (unresolved.length === 0) tier.push(name);
    }

    if (tier.length === 0) {
      const remaining = [...nameSet].filter((n) => !assigned.has(n));
      console.error(`Warning: circular dependency detected among: ${remaining.join(', ')}. Placing all in current tier.`);
      tier.push(...remaining);
    }

    tier.sort();
    tiers.push(tier);
    for (const name of tier) assigned.add(name);
  }

  return tiers;
}

// ── Mode: --discover ──

function runDiscover() {
  const root = path.resolve(flagValue('--root') || '.');
  const pkgJsons = findPackageJsons(root);
  const frontendPackages = [];

  for (const pkgPath of pkgJsons) {
    const result = isFrontendPackage(pkgPath);
    if (result) {
      const pkgDir = path.dirname(pkgPath);
      const sourceRoot = resolveSourceRoot(pkgDir);
      frontendPackages.push({
        name: result.name,
        framework: result.framework,
        path: path.relative(root, pkgDir) || '.',
        sourceRoot: path.relative(root, sourceRoot) || '.',
      });
    }
  }

  const allComponentDirs = [];
  for (const pkg of frontendPackages) {
    const absSourceRoot = path.resolve(root, pkg.sourceRoot);
    const dirs = findComponentDirs(absSourceRoot);
    for (const d of dirs) {
      allComponentDirs.push({
        path: path.relative(root, d.path),
        componentCount: d.componentCount,
        subdirs: d.subdirs,
      });
    }
  }

  const framework = frontendPackages.length > 0 ? frontendPackages[0].framework : 'unknown';

  const output = {
    framework,
    frontendPackages,
    componentDirectories: allComponentDirs,
  };

  console.log(JSON.stringify(output, null, 2));
}

// ── Mode: --scan ──

function runScan() {
  const scanDirs = flagValues('--scan');
  const browserMapPath = flagValue('--browser-map');
  const outputPath = flagValue('--output');
  const excludeRaw = flagValue('--exclude');
  const excludeSet = new Set(excludeRaw ? excludeRaw.split(',').map((s) => s.trim()) : []);

  if (scanDirs.length === 0) {
    console.error('Error: --scan requires at least one directory');
    process.exit(2);
  }

  // 1. Find all component files
  const allFiles = [];
  for (const dir of scanDirs) {
    const absDir = path.resolve(dir);
    allFiles.push(...walkDir(absDir, excludeSet));
  }

  // 2. Build name→path map
  const componentNameToPath = new Map();
  const componentsByName = new Map();

  for (const filePath of allFiles) {
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    if (componentNameToPath.has(name)) {
      const existing = componentNameToPath.get(name);
      console.error(`Warning: duplicate component name "${name}": ${existing} and ${filePath}. Keeping first.`);
      continue;
    }
    componentNameToPath.set(name, filePath);
    componentsByName.set(name, {
      name,
      source: 'code',
      sourcePath: filePath,
      codeDependencies: [],
    });
  }

  // 3. Resolve alias config from tsconfig.json
  const aliasConfig = resolveAliasBase(scanDirs.map((d) => path.resolve(d)));

  // 4. Parse imports for each component
  for (const [name, comp] of componentsByName) {
    const source = fs.readFileSync(comp.sourcePath, 'utf-8');
    const selfName = name;
    const deps = parseImports(source, comp.sourcePath, aliasConfig, componentNameToPath);
    comp.codeDependencies = deps.filter((d) => d !== selfName).sort();
  }

  // 5. Read browser-map if provided
  let browserMap = null;
  if (browserMapPath && fs.existsSync(browserMapPath)) {
    try {
      browserMap = JSON.parse(fs.readFileSync(browserMapPath, 'utf-8'));
    } catch (err) {
      console.error(`Warning: could not parse browser map at ${browserMapPath}: ${err.message}`);
    }
  }

  // 6. Merge browser data
  const browserComponents = new Map();
  if (browserMap && browserMap.tiers) {
    for (const tier of browserMap.tiers) {
      for (const comp of tier.components) {
        const entry = typeof comp === 'string' ? { name: comp } : comp;
        browserComponents.set(entry.name, entry);
      }
    }
  }

  // Merge: for each browser component, check if code found it too
  for (const [bName, bComp] of browserComponents) {
    if (componentsByName.has(bName)) {
      const codeComp = componentsByName.get(bName);
      codeComp.source = 'both';
      codeComp.routes = bComp.routes || [];
      codeComp.selector = bComp.selector || null;
      codeComp.instances = bComp.instances || 0;
      codeComp.figmaNodeId = bComp.figmaNodeId || null;
    } else {
      componentsByName.set(bName, {
        name: bName,
        source: 'browser',
        sourcePath: null,
        codeDependencies: [],
        routes: bComp.routes || [],
        selector: bComp.selector || null,
        instances: bComp.instances || 0,
        figmaNodeId: bComp.figmaNodeId || null,
      });
    }
  }

  // Also try to match browser components via source-map if present
  if (browserMap && browserMap.sourceMap) {
    for (const [bName, srcPath] of Object.entries(browserMap.sourceMap)) {
      if (componentsByName.has(bName) && srcPath && srcPath !== 'None') {
        const comp = componentsByName.get(bName);
        if (!comp.sourcePath) comp.sourcePath = srcPath;
      }
    }
  }

  // Ensure code-only components have default browser fields
  for (const comp of componentsByName.values()) {
    if (!comp.routes) comp.routes = [];
    if (!comp.selector) comp.selector = null;
    if (comp.instances === undefined) comp.instances = 0;
    if (!comp.figmaNodeId) comp.figmaNodeId = null;
  }

  // Make sourcePaths relative
  const cwd = process.cwd();
  for (const comp of componentsByName.values()) {
    if (comp.sourcePath && path.isAbsolute(comp.sourcePath)) {
      comp.sourcePath = path.relative(cwd, comp.sourcePath);
    }
  }

  // 7. Compute tiers from code dependencies
  const allComponents = [...componentsByName.values()];
  const tierNames = computeTiers(allComponents);

  // 8. Build output
  const tiers = tierNames.map((names, i) => ({
    tier: i + 1,
    label: i === 0 ? 'Leaf components (no dependencies)' : `Depends on tier ${i} and below`,
    components: names.map((n) => componentsByName.get(n)),
  }));

  const sourceBreakdown = { browser: 0, code: 0, both: 0 };
  for (const comp of allComponents) {
    sourceBreakdown[comp.source] = (sourceBreakdown[comp.source] || 0) + 1;
  }

  const output = {
    ...(browserMap || {}),
    scannedAt: new Date().toISOString(),
    componentCount: allComponents.length,
    sourceBreakdown,
    tiers,
    tree: browserMap?.tree || [],
  };

  if (outputPath) {
    const outDir = path.dirname(outputPath);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Wrote ${allComponents.length} components (${sourceBreakdown.both} both, ${sourceBreakdown.code} code-only, ${sourceBreakdown.browser} browser-only) to ${outputPath}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

// ── Main ──

if (flag('--discover')) {
  runDiscover();
} else if (flag('--scan')) {
  runScan();
} else {
  console.error(`Usage:
  discover-code-components.js --discover [--root <dir>]
  discover-code-components.js --scan <dir1> [dir2...] [--browser-map <path>] [--output <path>] [--exclude <name1,name2>]`);
  process.exit(2);
}
