/**
 * Shared component detection logic for discover-components.js and map-components.js.
 *
 * Runs inside page.evaluate() — all code here executes in the browser context.
 * Detects React 18+, React <18, Vue 3, Vue 2, Angular, and Svelte (dev mode).
 */

async function discoverOnPage(page, { minSize = 4 } = {}) {
  return await page.evaluate(({ minSize }) => {

    // ── Framework detection ──────────────────────────────────────────

    function detectFramework() {
      const sample = document.querySelectorAll('*');
      let react18 = false, reactOld = false, vue3 = false, vue2 = false;
      let angular = false, svelte = false;

      const limit = Math.min(sample.length, 200);
      for (let i = 0; i < limit; i++) {
        const el = sample[i];
        const keys = Object.keys(el);
        if (!react18 && keys.some(k => k.startsWith('__reactFiber$'))) react18 = true;
        if (!reactOld && keys.some(k => k.startsWith('__reactInternalInstance$'))) reactOld = true;
        if (!vue3 && el.__vueParentComponent) vue3 = true;
        if (!vue2 && el.__vue__) vue2 = true;
        if (!angular && el.__ngContext__) angular = true;
        if (!svelte && el.__svelte_meta) svelte = true;
      }

      if (!angular && document.querySelector('[ng-version]')) angular = true;
      if (!angular && typeof window.ng?.getComponent === 'function') angular = true;
      if (!vue3 && document.querySelector('[data-v-app]')) vue3 = true;

      const version = getFrameworkVersion({ react18, reactOld, vue3, vue2, angular, svelte });

      if (react18) return { name: 'react', generation: '18+', ...version };
      if (reactOld) return { name: 'react', generation: '<18', ...version };
      if (vue3) return { name: 'vue', generation: '3', ...version };
      if (vue2) return { name: 'vue', generation: '2', ...version };
      if (angular) return { name: 'angular', generation: 'ivy', ...version };
      if (svelte) return { name: 'svelte', generation: 'dev', ...version };
      return { name: 'unknown', generation: null, version: null, mode: null };
    }

    function getFrameworkVersion(flags) {
      let version = null;
      let mode = null;

      if (flags.react18 || flags.reactOld) {
        const rootEl = document.getElementById('root') || document.getElementById('app');
        if (rootEl?._reactRootContainer) {
          mode = 'legacy';
        } else if (rootEl && Object.keys(rootEl).some(k => k.startsWith('__reactContainer$'))) {
          mode = 'concurrent';
        }
        try {
          const v = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values()?.next()?.value?.version;
          if (v) version = v;
        } catch {}
      }

      if (flags.vue3 || flags.vue2) {
        try {
          if (window.Vue?.version) version = window.Vue.version;
          if (flags.vue3) {
            const appEl = document.querySelector('[data-v-app]') || document.getElementById('app');
            if (appEl?.__vue_app__?.version) version = appEl.__vue_app__.version;
          }
        } catch {}
        mode = flags.vue3 ? 'composition' : 'options';
      }

      if (flags.angular) {
        const ngEl = document.querySelector('[ng-version]');
        if (ngEl) version = ngEl.getAttribute('ng-version');
        mode = 'ivy';
      }

      return { version, mode };
    }

    // ── Visual prop extraction ───────────────────────────────────────

    function extractVisualProps(memoizedProps) {
      if (!memoizedProps) return {};
      const SKIP = new Set([
        'children', 'className', 'style', 'ref', 'key', 'id', 'asChild', 'forceMount', 'tabIndex',
        'value', 'defaultValue', 'label', 'displayValue', 'placeholder', 'name',
        'title', 'description', 'content', 'alt', 'src', 'href', 'to',
      ]);
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const result = {};
      for (const k of Object.keys(memoizedProps)) {
        if (SKIP.has(k)) continue;
        if (k.endsWith('Id') || k.endsWith('Uuid') || k.endsWith('Key')) continue;
        if (k.startsWith('on') || k.startsWith('data-') || k.startsWith('aria-')) continue;
        const v = memoizedProps[k];
        if (v === null || v === undefined) continue;
        if (typeof v === 'function') continue;
        if (typeof v === 'object') continue;
        if (typeof v === 'string') {
          if (!v || v.length > 50 || v.includes(' ') || v.startsWith('/') || v.startsWith('http')) continue;
          if (UUID_RE.test(v)) continue;
        }
        result[k] = v;
      }
      return result;
    }

    // ── Component extraction per framework ───────────────────────────

    function getReact18Components(root) {
      const components = [];
      const seenEls = new WeakSet();
      const seenFibers = new WeakSet();

      function walk(el) {
        if (seenEls.has(el)) return;
        seenEls.add(el);

        const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
        if (fiberKey) {
          const fiber = el[fiberKey];
          let node = fiber;
          while (node) {
            if (typeof node.type === 'function' || (typeof node.type === 'object' && node.type !== null)) {
              if (seenFibers.has(node)) break;
              const name = node.type?.displayName || node.type?.name || node.type?.render?.displayName || node.type?.render?.name;
              if (name && name.length > 1) {
                seenFibers.add(node);
                const props = extractVisualProps(node.memoizedProps);
                let parentFiber = node.return;
                let fiberParent = null;
                while (parentFiber) {
                  if (typeof parentFiber.type === 'function' || (typeof parentFiber.type === 'object' && parentFiber.type !== null)) {
                    const parentName = parentFiber.type?.displayName || parentFiber.type?.name || parentFiber.type?.render?.displayName || parentFiber.type?.render?.name;
                    if (parentName && parentName.length > 1 && parentName !== name) {
                      fiberParent = parentName;
                      break;
                    }
                  }
                  parentFiber = parentFiber.return;
                }
                components.push({ name, el, props, fiberParent });
                break;
              }
            }
            node = node.return;
          }
        }
        for (const child of el.children) walk(child);
      }

      walk(root);
      return components;
    }

    function getReactOldComponents(root) {
      const components = [];
      const seenEls = new WeakSet();
      const seenInst = new WeakSet();

      function walk(el) {
        if (seenEls.has(el)) return;
        seenEls.add(el);

        const key = Object.keys(el).find(k => k.startsWith('__reactInternalInstance$'));
        if (key) {
          let inst = el[key];
          while (inst) {
            if (seenInst.has(inst)) break;
            const name = inst._currentElement?.type?.displayName
              || inst._currentElement?.type?.name
              || inst.type?.displayName
              || inst.type?.name;
            if (name && name.length > 1 && /^[A-Z]/.test(name)) {
              seenInst.add(inst);
              components.push({ name, el });
              break;
            }
            inst = inst._hostParent || inst.return;
          }
        }
        for (const child of el.children) walk(child);
      }

      walk(root);
      return components;
    }

    function getVue3Components(root) {
      const components = [];
      const seen = new WeakSet();

      function walk(el) {
        if (seen.has(el)) return;
        seen.add(el);

        const comp = el.__vueParentComponent;
        if (comp) {
          const name = comp.type?.name || comp.type?.__name || comp.type?.displayName;
          if (name) components.push({ name, el });
        }
        for (const child of el.children) walk(child);
      }

      walk(root);
      return components;
    }

    function getVue2Components(root) {
      const components = [];
      const seen = new WeakSet();

      function walk(el) {
        if (seen.has(el)) return;
        seen.add(el);

        if (el.__vue__) {
          const vm = el.__vue__;
          const name = vm.$options.name || vm.$options._componentTag;
          if (name) components.push({ name, el });
        }
        for (const child of el.children) walk(child);
      }

      walk(root);
      return components;
    }

    function getAngularComponents(root) {
      const components = [];
      const seen = new WeakSet();
      const hasNgApi = typeof window.ng?.getComponent === 'function';

      function walk(el) {
        if (seen.has(el)) return;
        seen.add(el);

        if (hasNgApi) {
          try {
            const comp = window.ng.getComponent(el);
            if (comp) {
              const name = comp.constructor?.name;
              if (name && name !== 'Object' && name.length > 1) {
                components.push({ name, el });
              }
            }
          } catch {}
        }

        if (el.__ngContext__) {
          const tag = el.tagName?.toLowerCase();
          if (tag && tag.includes('-')) {
            const name = tag.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            components.push({ name, el, fromTag: true });
          }
        }

        for (const child of el.children) walk(child);
      }

      walk(root);
      return components;
    }

    function getSvelteComponents(root) {
      const components = [];
      const seen = new WeakSet();

      function walk(el) {
        if (seen.has(el)) return;
        seen.add(el);

        if (el.__svelte_meta) {
          const ctx = el.__svelte_meta;
          const name = ctx.loc?.file?.split('/')?.pop()?.replace('.svelte', '') || null;
          if (name) components.push({ name, el });
        }
        for (const child of el.children) walk(child);
      }

      walk(root);
      return components;
    }

    // ── Selector generation ──────────────────────────────────────────

    function generateSelector(el) {
      if (el.dataset?.testid) return `[data-testid="${el.dataset.testid}"]`;

      if (el.id && /^[a-zA-Z]/.test(el.id) && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
        return `#${CSS.escape(el.id)}`;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) {
        const sel = `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
        if (document.querySelectorAll(sel).length === 1) return sel;
      }

      const role = el.getAttribute('role');
      if (role && ariaLabel) {
        const sel = `[role="${role}"][aria-label="${ariaLabel}"]`;
        if (document.querySelectorAll(sel).length === 1) return sel;
      }

      const stableClasses = [...el.classList]
        .filter(c => !c.match(/^_|^css-|^sc-|^svelte-|^ng-|^v-|^__/))
        .filter(c => !c.match(/^\d|^jsx-/))
        .slice(0, 4);

      if (stableClasses.length > 0) {
        const sel = `${el.tagName.toLowerCase()}.${stableClasses.map(c => CSS.escape(c)).join('.')}`;
        if (document.querySelectorAll(sel).length === 1) return sel;
      }

      const segments = [];
      let current = el;
      while (current && current !== document.body && segments.length < 5) {
        const tag = current.tagName.toLowerCase();
        if (current.id && /^[a-zA-Z]/.test(current.id)) {
          segments.unshift(`#${CSS.escape(current.id)}`);
          break;
        }
        const parent = current.parentElement;
        if (parent) {
          const sameTag = [...parent.children].filter(c => c.tagName === current.tagName);
          if (sameTag.length === 1) {
            segments.unshift(tag);
          } else {
            segments.unshift(`${tag}:nth-of-type(${sameTag.indexOf(current) + 1})`);
          }
        } else {
          segments.unshift(tag);
        }
        current = parent;
      }
      return segments.join(' > ');
    }

    // ── Tree reconstruction ─────────────────────────────────────────

    function buildTree(rawComponents) {
      const entries = rawComponents.map(c => ({
        name: c.name,
        el: c.el,
        props: c.props || {},
        fiberParent: c.fiberParent || null,
        depth: getDepth(c.el),
      }));

      entries.sort((a, b) => a.depth - b.depth);

      const tree = [];
      const nodeMap = new Map();

      for (const entry of entries) {
        const node = { name: entry.name, props: entry.props, fiberParent: entry.fiberParent, children: [], el: entry.el };
        let parentEl = entry.el.parentElement;
        let parentNode = null;
        while (parentEl) {
          if (nodeMap.has(parentEl)) {
            parentNode = nodeMap.get(parentEl);
            break;
          }
          parentEl = parentEl.parentElement;
        }
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          tree.push(node);
        }
        nodeMap.set(entry.el, node);
      }

      const nameToNode = new Map();
      function indexNodes(nodes) {
        for (const node of nodes) {
          if (!nameToNode.has(node.name)) nameToNode.set(node.name, node);
          indexNodes(node.children);
        }
      }
      indexNodes(tree);

      const reparented = [];
      for (let i = tree.length - 1; i >= 0; i--) {
        const node = tree[i];
        if (node.fiberParent && nameToNode.has(node.fiberParent)) {
          const parent = nameToNode.get(node.fiberParent);
          parent.children.push(node);
          reparented.push(i);
        }
      }
      for (const idx of reparented) tree.splice(idx, 1);

      return tree;
    }

    function getDepth(el) {
      let d = 0;
      let n = el;
      while (n.parentElement) { d++; n = n.parentElement; }
      return d;
    }

    function serializeTree(nodes) {
      return nodes.map(n => ({
        name: n.name,
        props: n.props || {},
        children: serializeTree(n.children),
      }));
    }

    // ── Run ─────────────────────────────────────────────────────────

    const framework = detectFramework();

    let rawComponents = [];
    const root = document.body;

    switch (framework.name) {
      case 'react':
        rawComponents = framework.generation === '18+'
          ? getReact18Components(root)
          : getReactOldComponents(root);
        break;
      case 'vue':
        rawComponents = framework.generation === '3'
          ? getVue3Components(root)
          : getVue2Components(root);
        break;
      case 'angular':
        rawComponents = getAngularComponents(root);
        break;
      case 'svelte':
        rawComponents = getSvelteComponents(root);
        break;
    }

    const deduped = new Map();
    for (const { name, el } of rawComponents) {
      const box = el.getBoundingClientRect();
      if (box.width < minSize && box.height < minSize) continue;

      if (!deduped.has(name)) deduped.set(name, []);
      deduped.get(name).push({
        selector: generateSelector(el),
        box: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) },
        visible: box.width > 0 && box.height > 0 && el.offsetParent !== null,
        tag: el.tagName.toLowerCase(),
      });
    }

    const components = [...deduped.entries()]
      .map(([name, elements]) => ({ name, instances: elements.length, elements }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const tree = buildTree(rawComponents.filter(c => {
      const box = c.el.getBoundingClientRect();
      return box.width >= minSize || box.height >= minSize;
    }));

    return { framework, components, tree: serializeTree(tree) };
  }, { minSize });
}

module.exports = { discoverOnPage };
