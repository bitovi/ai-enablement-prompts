---
name: test-responsive-design
description: Make UIs responsive across all devices and verify responsiveness using Playwright. Includes scrollbar testing, breakpoint verification, and layout validation. Use when implementing new features, fixing layout issues, or ensuring mobile compatibility.
---

# Responsive Design & Verification Skill

## Purpose
Ensure all UI features are fully responsive and work correctly across all device sizes, from mobile to desktop.

## Standard Breakpoints

| Breakpoint | Min Width | Device Type |
|------------|-----------|-------------|
| default | 0px | Mobile |
| `sm:` | 640px | Large mobile |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large Desktop |

### Testing Sizes

```typescript
const testSizes = [
  { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
  { width: 768, height: 1024, name: 'Tablet (iPad)' },
  { width: 1280, height: 720, name: 'Desktop (HD)' },
  { width: 1920, height: 1080, name: 'Desktop (Full HD)' },
];
```

## Responsive Design Patterns

### Navigation
- Mobile (< 768px): Hamburger menu, collapsed drawer
- Desktop (≥ 768px): Full horizontal navigation bar

### Data Tables
- Mobile: Stack rows as cards or use horizontal scroll
- Desktop: Traditional table layout with all columns

### Forms
- Mobile: Single column, full-width inputs, large touch targets (≥ 44x44px)
- Desktop: Grid layouts, inline labels

### Layout
- Use `container mx-auto px-4 sm:px-6 lg:px-8`
- Responsive grids: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Typography
- Scale font sizes: `text-2xl md:text-3xl lg:text-4xl`

## Scrollbar & Overflow Testing

- Lists/Tables: Minimum 15-20 items to trigger vertical scroll
- Horizontal: Test with wide tables (8+ columns)
- Always check for unintentional horizontal page scroll

## Playwright Verification Workflow

### 1. Navigate to Feature
```
mcp_playwright_navigate → { url: 'http://localhost:5173/feature' }
```

### 2. Test Each Breakpoint
```typescript
const breakpoints = [
  { width: 375, height: 667, name: 'Mobile' },
  { width: 768, height: 1024, name: 'Tablet' },
  { width: 1280, height: 720, name: 'Desktop' },
];

for (const bp of breakpoints) {
  // Resize, screenshot, verify elements
  mcp_playwright_resize → { width: bp.width, height: bp.height }
  mcp_playwright_screenshot → { name: `feature-${bp.name}` }
}
```

### 3. Check for Overflow
```js
() => {
  const bodyWidth = document.body.scrollWidth;
  const windowWidth = window.innerWidth;
  return {
    hasOverflow: bodyWidth > windowWidth,
    overflowElements: Array.from(document.querySelectorAll('*'))
      .filter(el => el.scrollWidth > windowWidth)
      .map(el => ({ tag: el.tagName, class: el.className }))
  };
}
```

## Responsive Design Checklist

### Layout
- [ ] Content stacks on mobile (single column)
- [ ] Multi-column layouts work on tablet/desktop
- [ ] No horizontal overflow on any breakpoint
- [ ] Container max-widths prevent over-stretching

### Navigation
- [ ] Mobile: Hamburger menu or collapsed nav
- [ ] Desktop: Full navigation visible
- [ ] Touch targets ≥ 44x44px on mobile

### Tables/Lists
- [ ] Mobile: Card view or horizontal scroll
- [ ] Desktop: Full table with all columns
- [ ] Vertical scroll with 15-20+ items
- [ ] Sticky headers work when scrolling

### Typography
- [ ] Font sizes scale with breakpoints
- [ ] Line length appropriate (45-75 characters)
- [ ] Text remains readable on small screens

## Common Mistakes
1. Desktop-first thinking — start mobile-first
2. Fixed widths — use `w-full`, `max-w-*`
3. Insufficient test data — always provide 15-20+ items
4. Tiny touch targets — 44x44px minimum on mobile
