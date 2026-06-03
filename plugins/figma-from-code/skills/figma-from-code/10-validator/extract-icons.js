/**
 * Icon and asset extractor for figma-from-code
 *
 * Statically analyzes the codebase to discover Lucide icon usage and SVG assets,
 * then extracts SVG data from the Lucide source for Figma vector creation.
 *
 * Usage:
 *   node extract-icons.js --scan <srcDir> --output <output.json>
 *
 * Output: JSON with icons (name, svgString, usedBy), assets, and iconsByComponent map
 */

const fs = require('fs');
const path = require('path');

function findTsxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...findTsxFiles(fullPath));
    } else if (
      entry.isFile() &&
      /\.tsx?$/.test(entry.name) &&
      !/\.(test|stories|spec)\./.test(entry.name)
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractLucideImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const icons = [];
  const importRe = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  let match;
  while ((match = importRe.exec(content)) !== null) {
    const names = match[1]
      .split(',')
      .map((s) => {
        const trimmed = s.trim();
        const asMatch = trimmed.match(/^(\w+)\s+as\s+\w+$/);
        return asMatch ? asMatch[1] : trimmed;
      })
      .filter(Boolean);
    icons.push(...names);
  }
  return icons;
}

function extractSvgAssetImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const assets = [];
  const svgImportRe = /import\s+(\w+)\s+from\s+['"]([^'"]+\.svg)['"]/g;
  let match;
  while ((match = svgImportRe.exec(content)) !== null) {
    assets.push({ importName: match[1], importPath: match[2] });
  }
  return assets;
}

function pascalToKebab(name) {
  return name
    .replace(/([a-z])(\d)/g, '$1-$2')
    .replace(/(\d)([A-Z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function componentNameFromPath(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  if (/^(index|types)$/.test(basename)) {
    return path.basename(path.dirname(filePath));
  }
  return basename;
}

function resolveIconSource(iconName, iconsDir, visited = new Set()) {
  const kebab = pascalToKebab(iconName);
  const filePath = path.join(iconsDir, `${kebab}.js`);

  if (!fs.existsSync(filePath)) return null;
  if (visited.has(filePath)) return null;
  visited.add(filePath);

  const content = fs.readFileSync(filePath, 'utf8');

  const reExportMatch = content.match(/export\s+\{\s*default\s*\}\s+from\s+['"]\.\/([^'"]+)['"]/);
  if (reExportMatch) {
    const targetName = reExportMatch[1].replace(/\.js$/, '');
    const targetPath = path.join(iconsDir, `${targetName}.js`);
    if (!fs.existsSync(targetPath)) return null;
    return resolveIconSource(
      targetName
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(''),
      iconsDir,
      visited
    );
  }

  return { content, filePath };
}

function parseCreateLucideIcon(content) {
  const match = content.match(/createLucideIcon\(\s*"[^"]+"\s*,\s*(\[[\s\S]*?\])\s*\)/);
  if (!match) return null;

  let elementsStr = match[1];
  elementsStr = elementsStr.replace(/,\s*key:\s*"[^"]*"/g, '');

  try {
    const parsed = JSON.parse(elementsStr);
    return parsed;
  } catch {
    try {
      const sanitized = elementsStr.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

function elementsToSvgString(elements) {
  const children = elements
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${attrStr}/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function resolveSvgAssetPath(importPath, srcDir) {
  const cleaned = importPath.replace(/^@\//, '');
  return path.join(srcDir, cleaned);
}

function main() {
  const args = process.argv.slice(2);
  const scanIdx = args.indexOf('--scan');
  const outputIdx = args.indexOf('--output');

  if (scanIdx === -1 || !args[scanIdx + 1]) {
    process.stderr.write('Usage: node extract-icons.js --scan <srcDir> --output <output.json>\n');
    process.exit(1);
  }

  const srcDir = path.resolve(args[scanIdx + 1]);
  const outputPath =
    outputIdx !== -1 && args[outputIdx + 1] ? path.resolve(args[outputIdx + 1]) : null;

  const projectRoot = path.resolve(srcDir, '../../..');
  const iconsDir = path.join(projectRoot, 'node_modules/lucide-react/dist/esm/icons');

  if (!fs.existsSync(iconsDir)) {
    process.stderr.write(`Lucide icons directory not found: ${iconsDir}\n`);
    process.exit(1);
  }

  const tsxFiles = findTsxFiles(srcDir);

  const iconUsageMap = {};
  const assetUsageMap = {};
  const iconsByComponent = {};

  for (const filePath of tsxFiles) {
    const componentName = componentNameFromPath(filePath);
    const icons = extractLucideImports(filePath);
    if (icons.length > 0) {
      iconsByComponent[componentName] = icons;
      for (const icon of icons) {
        if (!iconUsageMap[icon]) iconUsageMap[icon] = new Set();
        iconUsageMap[icon].add(componentName);
      }
    }

    const assets = extractSvgAssetImports(filePath);
    for (const asset of assets) {
      if (!assetUsageMap[asset.importName]) {
        assetUsageMap[asset.importName] = {
          importPath: asset.importPath,
          usedBy: new Set(),
        };
      }
      assetUsageMap[asset.importName].usedBy.add(componentName);
    }
  }

  const iconResults = [];
  for (const [iconName, usedBySet] of Object.entries(iconUsageMap)) {
    const source = resolveIconSource(iconName, iconsDir);
    if (!source) {
      process.stderr.write(`Warning: could not resolve icon "${iconName}"\n`);
      continue;
    }

    const elements = parseCreateLucideIcon(source.content);
    if (!elements) {
      process.stderr.write(`Warning: could not parse icon "${iconName}" from ${source.filePath}\n`);
      continue;
    }

    iconResults.push({
      name: iconName,
      elements,
      svgString: elementsToSvgString(elements),
      usedBy: [...usedBySet].sort(),
    });
  }
  iconResults.sort((a, b) => a.name.localeCompare(b.name));

  const assetResults = [];
  for (const [name, info] of Object.entries(assetUsageMap)) {
    const resolvedPath = resolveSvgAssetPath(info.importPath, srcDir);
    const entry = {
      name,
      importPath: info.importPath,
      sourcePath: path.relative(projectRoot, resolvedPath),
      usedBy: [...info.usedBy].sort(),
      type: 'svg-file',
    };
    if (fs.existsSync(resolvedPath)) {
      entry.svgString = fs.readFileSync(resolvedPath, 'utf8').trim();
    }
    assetResults.push(entry);
  }

  const result = {
    icons: iconResults,
    assets: assetResults,
    iconsByComponent,
    summary: {
      totalIcons: iconResults.length,
      totalAssets: assetResults.length,
      componentsWithIcons: Object.keys(iconsByComponent).length,
    },
  };

  const json = JSON.stringify(result, null, 2);

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, json);
    process.stderr.write(
      `Wrote ${result.summary.totalIcons} icons and ${result.summary.totalAssets} assets to ${outputPath}\n`
    );
  } else {
    process.stdout.write(json + '\n');
  }
}

main();
