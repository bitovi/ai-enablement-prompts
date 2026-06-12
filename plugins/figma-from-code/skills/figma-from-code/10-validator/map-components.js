/**
 * Multi-route component mapper with build order computation.
 *
 * Visits multiple routes in a single browser session, discovers components
 * on each page, merges into a unified dependency tree, and computes a
 * bottom-up build order (leaves first) for Figma component construction.
 *
 * Usage:
 *   node map-components.js <base-url> --routes /,/about,/dashboard [options]
 *
 * Options:
 *   --routes <paths>       Comma-separated route paths (default: /)
 *   --crawl                Auto-discover routes by following internal links
 *   --max-crawl <n>        Max pages to crawl (default: 20)
 *   --output <file.json>   Write JSON results to file
 *   --markdown <file.md>   Write human-readable tree + build order
 *   --include-lib          Include library/internal components
 *   --click <selector>     Click an element on every page before discovery
 *   --wait <ms>            Extra wait after each page load (default: 0)
 *   --interactions <file>  Run interaction scenarios after the passive crawl to
 *                          reveal gated components (dialogs, menus, edit modes).
 *                          File format: {"scenarios": [{"id", "route", "steps":
 *                          [{"click"|"hover"|"press"|"fill", "settle"?}], "expect"?, "settle"?}]}
 *   --augment <map.json>   Seed from a previous map-components output and merge new
 *                          findings into it (skips the passive crawl unless --routes given)
 */

const { getBrowser } = require('./browser-connect');
const { discoverOnPage } = require('./detect-components');
const { isLibraryComponent } = require('./library-filter');
const fs = require('fs');
const path = require('path');

const DYNAMIC_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9a-f]{24}$|^\d+$/i;

function normalizeRoute(route) {
  return '/' + route.split('/').filter(Boolean).map(seg => DYNAMIC_SEGMENT.test(seg) ? ':id' : seg).join('/');
}

function normalizeRoutes(routes) {
  return [...new Set(routes.map(normalizeRoute))].sort();
}

const args = process.argv.slice(2);
if (args.length < 1 || args[0].startsWith('--')) {
  console.error('Usage: node map-components.js <base-url> --routes /,/about [--crawl] [--output file.json] [--markdown file.md]');
  process.exit(1);
}

const baseUrl = args[0].replace(/\/$/, '');
const opts = {
  routes: ['/'],
  crawl: false,
  maxCrawl: 20,
  output: null,
  markdown: null,
  includeLib: false,
  click: null,
  wait: 0,
  interactions: null,
  augment: null,
};

let routesExplicit = false;

for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case '--routes': opts.routes = args[++i].split(',').map(r => r.trim()); routesExplicit = true; break;
    case '--crawl': opts.crawl = true; break;
    case '--max-crawl': opts.maxCrawl = Number(args[++i]); break;
    case '--output': opts.output = args[++i]; break;
    case '--markdown': opts.markdown = args[++i]; break;
    case '--include-lib': opts.includeLib = true; break;
    case '--click': opts.click = args[++i]; break;
    case '--wait': opts.wait = Number(args[++i]); break;
    case '--interactions': opts.interactions = args[++i]; break;
    case '--augment': opts.augment = args[++i]; break;
  }
}

(async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  let existing = null;
  if (opts.augment) {
    existing = JSON.parse(fs.readFileSync(opts.augment, 'utf-8'));
  }

  let routes = existing && !routesExplicit ? [] : [...opts.routes];

  if (opts.crawl && routes.length > 0) {
    console.error('Crawling for routes...');
    await page.goto(baseUrl + routes[0], { waitUntil: 'networkidle', timeout: 15000 });
    const discovered = await page.evaluate((base) => {
      const origin = new URL(base).origin;
      return [...new Set(
        [...document.querySelectorAll('a[href]')]
          .map(a => {
            try { return new URL(a.href, origin); } catch { return null; }
          })
          .filter(u => u && u.origin === origin)
          .map(u => u.pathname)
      )];
    }, baseUrl);
    routes = [...new Set([...routes, ...discovered])].slice(0, opts.maxCrawl);
    console.error(`Found ${routes.length} routes: ${routes.join(', ')}`);
  }

  // ── Discover components on each route ──────────────────────────

  const perRoute = [];
  let framework = null;

  for (const route of routes) {
    const fullUrl = baseUrl + route;
    console.error(`Scanning ${route}...`);

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });

      if (opts.click) {
        try {
          const trigger = page.locator(opts.click).first();
          await trigger.waitFor({ state: 'visible', timeout: 3000 });
          await trigger.click();
          await page.waitForTimeout(400);
        } catch {}
      }

      if (opts.wait > 0) await page.waitForTimeout(opts.wait);

      const result = await discoverOnPage(page);
      if (!framework) framework = result.framework;
      perRoute.push({ route, ...result });
    } catch (err) {
      console.error(`  Failed: ${err.message.split('\n')[0]}`);
    }
  }

  if (!framework && existing) framework = existing.framework;

  const allRoutes = [...new Set([...(existing?.routes || []), ...routes])];

  // ── Interaction scenarios: reveal gated components ─────────────

  const interactionResults = [];

  if (opts.interactions) {
    const scenarios = JSON.parse(fs.readFileSync(opts.interactions, 'utf-8')).scenarios || [];

    const resolveScenarioRoute = async (pattern) => {
      if (allRoutes.includes(pattern)) return pattern;
      if (!pattern.includes(':')) return pattern;
      const match = allRoutes.find(r => normalizeRoute(r) === pattern);
      if (match) return match;
      const prefix = pattern.split('/:')[0] + '/';
      try {
        await page.goto(baseUrl + prefix, { waitUntil: 'networkidle', timeout: 15000 });
        const finalPath = new URL(page.url()).pathname;
        return normalizeRoute(finalPath) === pattern ? finalPath : null;
      } catch {
        return null;
      }
    };

    const runStep = async (step) => {
      if (step.click) {
        const target = page.locator(step.click).first();
        await target.waitFor({ state: 'visible', timeout: 3000 });
        await target.click();
      } else if (step.hover) {
        const target = page.locator(step.hover).first();
        await target.waitFor({ state: 'visible', timeout: 3000 });
        await target.hover();
      } else if (step.press) {
        await page.keyboard.press(step.press);
      } else if (step.fill) {
        const target = page.locator(step.fill.selector).first();
        await target.waitFor({ state: 'visible', timeout: 3000 });
        await target.fill(step.fill.value);
      }
      await page.waitForTimeout(step.settle || 400);
    };

    for (const scenario of scenarios) {
      const record = { id: scenario.id, status: 'ok', found: [] };
      const concreteRoute = await resolveScenarioRoute(scenario.route);
      if (!concreteRoute) {
        record.status = 'no_matching_route';
        interactionResults.push(record);
        console.error(`Interaction ${scenario.id}: no visited route matches ${scenario.route}`);
        continue;
      }
      record.route = concreteRoute;
      console.error(`Interaction ${scenario.id} on ${concreteRoute}...`);

      try {
        await page.goto(baseUrl + concreteRoute, { waitUntil: 'networkidle', timeout: 15000 });
        const before = await discoverOnPage(page);
        const beforeVisible = new Map(before.components.map(c => [c.name, c.elements.some(e => e.visible)]));

        for (const step of scenario.steps || []) await runStep(step);
        if (scenario.settle) await page.waitForTimeout(scenario.settle);

        const after = await discoverOnPage(page);
        if (!framework) framework = after.framework;

        const interaction = {
          id: scenario.id,
          clicks: (scenario.steps || []).filter(s => s.click).map(s => s.click),
          hover: (scenario.steps || []).find(s => s.hover)?.hover || null,
        };

        const revealed = after.components.filter(c => {
          const wasVisible = beforeVisible.get(c.name);
          const nowVisible = c.elements.some(e => e.visible);
          return nowVisible && wasVisible !== true;
        });

        record.found = revealed.map(c => c.name).filter(n => opts.includeLib || !isLibraryComponent(n));
        if (revealed.length > 0) {
          perRoute.push({ route: concreteRoute, interaction, components: revealed, tree: after.tree });
        }
        if (scenario.expect) {
          const missing = scenario.expect.filter(n => !record.found.includes(n));
          if (missing.length > 0) {
            record.status = 'missing_expected';
            record.missing = missing;
          }
        }
        await page.keyboard.press('Escape');
      } catch (err) {
        record.status = 'failed';
        record.error = err.message.split('\n')[0];
      }
      interactionResults.push(record);
      console.error(`  ${record.status}: ${record.found.join(', ') || 'nothing revealed'}`);
    }
  }

  // ── Merge: unified dependency graph ────────────────────────────

  const edges = new Map();
  const allComponents = new Map();

  if (existing) {
    for (const tier of existing.tiers || []) {
      for (const comp of tier.components) {
        const entry = {
          name: comp.name,
          routes: comp.routes ? [...comp.routes] : [],
          selectors: [],
          instances: comp.instances || 0,
        };
        const cap = comp.capture;
        if (cap && cap.selector) {
          entry.selectors.push({
            selector: cap.selector,
            candidates: [cap.selector, ...(cap.fallbackSelectors || [])],
            route: cap.url,
            box: null,
            interaction: cap.interaction || null,
            viewport: cap.viewport || null,
          });
        } else if (comp.selector) {
          entry.selectors.push({
            selector: comp.selector,
            candidates: [comp.selector],
            route: entry.routes[0] || '/',
            box: null,
            interaction: null,
          });
        }
        allComponents.set(comp.name, entry);
        if (!edges.has(comp.name)) edges.set(comp.name, new Set());
        for (const child of comp.children || []) edges.get(comp.name).add(child);
      }
    }
  }

  function extractEdges(nodes, parent) {
    for (const node of nodes) {
      const name = node.name;
      if (!edges.has(name)) edges.set(name, new Set());
      if (parent) {
        if (!edges.has(parent)) edges.set(parent, new Set());
        edges.get(parent).add(name);
      }
      extractEdges(node.children || [], name);
    }
  }

  for (const { route, components, tree, interaction } of perRoute) {
    extractEdges(tree, null);

    for (const comp of components) {
      if (!allComponents.has(comp.name)) {
        allComponents.set(comp.name, { name: comp.name, routes: [], selectors: [], instances: 0 });
      }
      const entry = allComponents.get(comp.name);
      if (!entry.routes.includes(route)) entry.routes.push(route);
      entry.instances += comp.instances;
      for (const el of comp.elements) {
        if (el.visible && !entry.selectors.some(s => s.selector === el.selector)) {
          entry.selectors.push({
            selector: el.selector,
            candidates: el.candidates || [el.selector],
            route,
            box: el.box,
            interaction: interaction || null,
          });
        }
      }
    }
  }

  // ── Filter library components ──────────────────────────────────

  if (!opts.includeLib) {
    for (const name of [...edges.keys()]) {
      if (isLibraryComponent(name)) {
        edges.delete(name);
        allComponents.delete(name);
      }
    }
    for (const [, children] of edges) {
      for (const child of [...children]) {
        if (isLibraryComponent(child)) children.delete(child);
      }
    }
  }

  // ── Disambiguate component name collisions ─────────────────────
  // A name collision occurs when the same React display name (e.g. "Header")
  // is used for both a root-level component AND a nested sub-component inside
  // a different parent. In allComponents both map to the same key, so the
  // second one overwrites the first's node ID in the built-components map.
  //
  // Detection: build a reverse-parent map from edges. If a name appears as
  // a child of some parent, AND that same name also appears as a top-level
  // component (nothing points to it), there is a collision. The nested one
  // gets renamed to "ParentName/ChildName" in edges and allComponents.
  //
  // Genuine reuse (Button, Icon appearing under many parents) is NOT a
  // collision — those components are NOT also top-level roots.

  {
    // Build: parentOf[child] = Set of parent names that have this child
    const parentOf = new Map();
    for (const [parent, children] of edges) {
      for (const child of children) {
        if (!parentOf.has(child)) parentOf.set(child, new Set());
        parentOf.get(child).add(parent);
      }
    }

    // Top-level names: present in allComponents but NOT referenced as a child
    // by any other component in edges.
    const topLevel = new Set();
    for (const name of allComponents.keys()) {
      if (!parentOf.has(name) || parentOf.get(name).size === 0) {
        topLevel.add(name);
      }
    }

    // Find names that are BOTH a top-level component AND a child of something.
    // Those are genuine collisions: the same display name used for two distinct
    // visual components at different tree depths.
    //
    // We also handle the case where a name appears as a child of multiple
    // parents AND appears in allComponents, but is NOT top-level — this is
    // genuine reuse (skip it).
    //
    // For each collision: the top-level entry keeps its name; every nested
    // occurrence (parent → name edge) gets renamed to "Parent/name".
    const renames = new Map(); // oldName -> Map<parentName, qualifiedName>

    for (const name of allComponents.keys()) {
      const parents = parentOf.get(name);
      if (!parents || parents.size === 0) continue; // pure top-level, no collision
      if (!topLevel.has(name)) continue; // not also a top-level root, genuine reuse

      // This name is BOTH a top-level root AND a nested child — collision!
      // Skip very common components that would appear everywhere (>3 parents
      // and NOT a root = genuine reuse, already excluded above; but guard anyway).
      if (parents.size > 3) continue;

      const parentRenames = new Map();
      for (const parentName of parents) {
        const qualifiedName = `${parentName}/${name}`;
        parentRenames.set(parentName, qualifiedName);
      }
      renames.set(name, parentRenames);
    }

    for (const [oldName, parentRenames] of renames) {
      for (const [parentName, qualifiedName] of parentRenames) {
        // 1. Rewrite the parent's child list in edges
        const parentChildren = edges.get(parentName);
        if (parentChildren && parentChildren.has(oldName)) {
          parentChildren.delete(oldName);
          parentChildren.add(qualifiedName);
        }

        // 2. Add an edges entry for the qualified name (copy children from old)
        if (!edges.has(qualifiedName)) {
          const oldChildren = edges.get(oldName);
          edges.set(qualifiedName, oldChildren ? new Set(oldChildren) : new Set());
        }

        // 3. Add an allComponents entry for the qualified name
        if (!allComponents.has(qualifiedName)) {
          const oldEntry = allComponents.get(oldName);
          if (oldEntry) {
            allComponents.set(qualifiedName, { ...oldEntry, name: qualifiedName });
          }
        }

        console.error(`  [disambiguate] "${oldName}" under "${parentName}" → "${qualifiedName}"`);
      }

      // The original top-level entry in allComponents and edges keeps its name.
      // The nested qualified entries now live separately.
    }
  }

  // ── Compute build tiers (topological sort, leaves first) ───────

  const childrenOf = new Map();
  for (const [parent, kids] of edges) {
    childrenOf.set(parent, new Set(kids));
  }
  for (const name of allComponents.keys()) {
    if (!childrenOf.has(name)) childrenOf.set(name, new Set());
  }

  const tiers = [];
  const assigned = new Set();

  while (assigned.size < childrenOf.size) {
    const tier = [];
    for (const [name, children] of childrenOf) {
      if (assigned.has(name)) continue;
      const unassignedChildren = [...children].filter(c => !assigned.has(c) && childrenOf.has(c));
      if (unassignedChildren.length === 0) {
        tier.push(name);
      }
    }
    if (tier.length === 0) {
      const remaining = [...childrenOf.keys()].filter(n => !assigned.has(n));
      tier.push(...remaining);
    }
    tier.sort();
    tiers.push(tier);
    for (const name of tier) assigned.add(name);
  }

  // ── Build merged tree (deduplicated) ───────────────────────────

  function mergeTreesFromRoutes(perRouteData) {
    const merged = new Map();

    function addNodes(nodes, parent) {
      for (const node of nodes) {
        const key = parent ? `${parent}→${node.name}` : node.name;
        if (!merged.has(key)) {
          merged.set(key, { name: node.name, parent, childKeys: new Set() });
        }
        for (const child of node.children || []) {
          merged.get(key).childKeys.add(parent ? `${node.name}→${child.name}` : `${node.name}→${child.name}`);
          addNodes([child], node.name);
        }
      }
    }

    for (const { tree } of perRouteData) {
      addNodes(tree, null);
    }

    function buildMergedTree(parentName, ancestors = new Set()) {
      const result = [];
      for (const [key, entry] of merged) {
        if (entry.parent === parentName) {
          if (!opts.includeLib && isLibraryComponent(entry.name)) continue;
          if (ancestors.has(entry.name)) continue;
          const nextAncestors = new Set(ancestors);
          nextAncestors.add(entry.name);
          result.push({
            name: entry.name,
            children: buildMergedTree(entry.name, nextAncestors),
          });
        }
      }
      const seen = new Set();
      return result.filter(n => {
        if (seen.has(n.name)) return false;
        seen.add(n.name);
        return true;
      });
    }

    return buildMergedTree(null);
  }

  const treeSources = existing && Array.isArray(existing.tree) && existing.tree.length > 0
    ? [{ tree: existing.tree }, ...perRoute]
    : perRoute;
  const mergedTree = mergeTreesFromRoutes(treeSources);

  // ── Assemble output ────────────────────────────────────────────

  function pickBestSelectorEntry(comp) {
    const sels = comp?.selectors || [];
    if (sels.length === 0) return null;
    const score = (s) =>
      (s.interaction ? 0 : 2) +
      (s.selector && !s.selector.includes(':nth-of-type(') ? 4 : 0);
    return [...sels].sort((a, b) => score(b) - score(a))[0];
  }

  const output = {
    baseUrl,
    routes: allRoutes,
    framework,
    scannedAt: new Date().toISOString(),
    componentCount: allComponents.size,
    tiers: tiers.map((names, i) => ({
      tier: i + 1,
      label: i === 0 ? 'Leaf components (no children)'
        : i === tiers.length - 1 ? 'Top-level layouts'
        : `Depends on tier ${i} and below`,
      components: names.map(n => {
        const comp = allComponents.get(n);
        const children = [...(childrenOf.get(n) || [])];
        const best = pickBestSelectorEntry(comp);
        return {
          name: n,
          children: children.length > 0 ? children : undefined,
          routes: comp?.routes,
          selector: best?.selector,
          capture: best ? {
            url: best.route,
            selector: best.selector,
            fallbackSelectors: (best.candidates || []).filter(c => c && c !== best.selector),
            interaction: best.interaction || null,
            viewport: best.viewport || null,
          } : null,
          instances: comp?.instances || 0,
        };
      }),
    })),
    tree: mergedTree,
  };

  if (opts.interactions) output.interactionResults = interactionResults;

  // ── Console output ─────────────────────────────────────────────

  console.log(`\nFramework: ${framework?.name || 'unknown'} ${framework?.generation || ''}${framework?.version ? ' v' + framework.version : ''}`);
  console.log(`Routes scanned: ${allRoutes.length}`);
  if (opts.interactions) {
    const ok = interactionResults.filter(r => r.status === 'ok').length;
    console.log(`Interaction scenarios: ${ok}/${interactionResults.length} ok`);
  }
  console.log(`Components found: ${allComponents.size}`);
  console.log(`Build tiers: ${tiers.length}\n`);

  for (let i = 0; i < tiers.length; i++) {
    const label = i === 0 ? 'Leaf components' : i === tiers.length - 1 ? 'Top-level layouts' : `Tier ${i + 1}`;
    console.log(`  ${label}: ${tiers[i].join(', ')}`);
  }

  // ── Write JSON ─────────────────────────────────────────────────

  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(opts.output, JSON.stringify(output, null, 2));
    console.log(`\nJSON: ${opts.output}`);
  }

  // ── Write Markdown ─────────────────────────────────────────────

  if (opts.markdown) {
    const lines = [];
    lines.push(`# Component Map — ${baseUrl}`);
    lines.push('');
    const displayRoutes = normalizeRoutes(allRoutes);
    lines.push(`**Framework:** ${framework?.name || 'unknown'} ${framework?.generation || ''}${framework?.version ? ' v' + framework.version : ''}`);
    lines.push(`**Routes scanned:** ${displayRoutes.join(', ')}  _(${allRoutes.length} pages visited)_`);
    lines.push(`**Components:** ${allComponents.size}`);
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');

    lines.push('## Component Hierarchy');
    lines.push('');
    lines.push('```mermaid');
    lines.push('graph TD');
    const mermaidEdges = new Set();
    const mermaidNodes = new Set();
    function sanitizeId(name) { return name.replace(/[^a-zA-Z0-9]/g, '_'); }
    function collectMermaidEdges(nodes, parent) {
      for (const node of nodes) {
        const id = sanitizeId(node.name);
        mermaidNodes.add(id);
        if (parent) {
          const parentId = sanitizeId(parent);
          const edgeKey = `${parentId} --> ${id}`;
          if (!mermaidEdges.has(edgeKey)) {
            mermaidEdges.add(edgeKey);
          }
        }
        collectMermaidEdges(node.children, node.name);
      }
    }
    collectMermaidEdges(mergedTree, null);
    const tierLookup = new Map();
    for (let i = 0; i < tiers.length; i++) {
      for (const name of tiers[i]) tierLookup.set(name, i + 1);
    }
    const tierStyles = [
      'fill:#e8f5e9,stroke:#43a047',
      'fill:#e3f2fd,stroke:#1e88e5',
      'fill:#fff3e0,stroke:#fb8c00',
      'fill:#fce4ec,stroke:#e53935',
      'fill:#f3e5f5,stroke:#8e24aa',
      'fill:#e0f7fa,stroke:#00897b',
      'fill:#fff9c4,stroke:#f9a825',
      'fill:#efebe9,stroke:#6d4c41',
    ];
    for (const id of mermaidNodes) {
      const origName = [...allComponents.keys()].find(n => sanitizeId(n) === id) || id;
      lines.push(`    ${id}["${origName}"]`);
    }
    for (const edge of mermaidEdges) {
      lines.push(`    ${edge}`);
    }
    for (const [name] of allComponents) {
      const tier = tierLookup.get(name);
      if (tier) {
        const style = tierStyles[(tier - 1) % tierStyles.length];
        lines.push(`    style ${sanitizeId(name)} ${style}`);
      }
    }
    lines.push('```');
    lines.push('');
    lines.push('> Colors indicate build tier: ');
    const tierCount = tiers.length;
    const legendParts = [];
    for (let i = 0; i < tierCount; i++) {
      const label = i === 0 ? 'Leaf' : i === tierCount - 1 ? 'Layout' : `Tier ${i + 1}`;
      const color = tierStyles[i % tierStyles.length].match(/fill:([^,]+)/)?.[1] || '';
      legendParts.push(`**${label}** (Tier ${i + 1})`);
    }
    lines.push(`> ${legendParts.join(' → ')}`);
    lines.push('');

    lines.push('## Component Details');
    lines.push('');
    lines.push('| Component | Tier | Routes | Instances |');
    lines.push('|-----------|------|--------|-----------|');
    for (let i = 0; i < tiers.length; i++) {
      for (const name of tiers[i]) {
        const comp = allComponents.get(name);
        const compRoutes = normalizeRoutes(comp?.routes || []).join(', ');
        lines.push(`| ${name} | ${i + 1} | ${compRoutes} | ${comp?.instances || 0} |`);
      }
    }

    lines.push('');
    lines.push('## Component Instances by Page');
    lines.push('');

    const routeGroups = new Map();
    for (const entry of perRoute) {
      const normalized = normalizeRoute(entry.route);
      if (!routeGroups.has(normalized)) routeGroups.set(normalized, entry);
    }

    function formatNodeLabel(node) {
      const propEntries = Object.entries(node.props || {});
      if (propEntries.length === 0) return node.name;
      const propsStr = propEntries.map(([k, v]) =>
        typeof v === 'boolean' ? (v ? k : `${k}={false}`) : `${k}="${v}"`
      ).join(' ');
      return `\`<${node.name} ${propsStr}>\``;
    }

    function printPageTree(nodes, depth) {
      const indent = '    '.repeat(depth);
      for (const node of nodes) {
        if (!opts.includeLib && isLibraryComponent(node.name)) {
          printPageTree(node.children || [], depth);
          continue;
        }
        lines.push(`${indent}- [ ] ${formatNodeLabel(node)}`);
        printPageTree(node.children || [], depth + 1);
      }
    }

    for (const [normalized, entry] of routeGroups) {
      lines.push(`### ${normalized}`);
      lines.push('');
      printPageTree(entry.tree || [], 0);
      lines.push('');
    }

    lines.push('## Component Variations');
    lines.push('');

    const variations = new Map();
    function collectVariations(nodes) {
      for (const node of nodes) {
        if (!opts.includeLib && isLibraryComponent(node.name)) {
          collectVariations(node.children || []);
          continue;
        }
        const propEntries = Object.entries(node.props || {});
        if (propEntries.length > 0) {
          if (!variations.has(node.name)) variations.set(node.name, new Set());
          const key = propEntries.map(([k, v]) => `${k}=${v}`).join(', ');
          variations.get(node.name).add(key);
        }
        collectVariations(node.children || []);
      }
    }
    for (const { tree } of perRoute) collectVariations(tree || []);

    if (variations.size > 0) {
      lines.push('| Component | Visual Props Seen |');
      lines.push('|-----------|-------------------|');
      for (const [name, props] of [...variations.entries()].sort()) {
        const propList = [...props].map(p => `\`${p}\``).join(', ');
        lines.push(`| ${name} | ${propList} |`);
      }
    } else {
      lines.push('_No visual props detected across scanned pages._');
    }

    fs.mkdirSync(path.dirname(path.resolve(opts.markdown)), { recursive: true });
    fs.writeFileSync(opts.markdown, lines.join('\n'));
    console.log(`Markdown: ${opts.markdown}`);
  }

  if (!opts.output && !opts.markdown) {
    process.stdout.write('\n' + JSON.stringify(output, null, 2));
  }

  await browser.close();
})().catch(err => {
  console.error('map-components.js error:', err.message);
  process.exit(1);
});
