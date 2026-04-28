---
name: validate-implementation
description: Validate an implementation for runtime errors, accessibility, and API compliance before committing. Use as a final quality gate after implementing a feature or component.
---

# Skill: Validate Implementation

A quality gate that checks for runtime errors, accessibility issues, and API compliance.

## When to Use

After implementing a feature or component, before committing.

## Validation Steps

### Step 1: TypeScript Type Checking

```bash
npm run typecheck
# or: npx tsc --noEmit
```

Fix any type errors before proceeding.

### Step 2: ESLint

```bash
npm run lint
# or: npx eslint src/
```

Fix any lint errors.

### Step 3: Unit Tests

```bash
npm run test
# or: npx vitest run
```

All tests must pass.

### Step 4: Browser Validation (via Playwright MCP)

If Playwright MCP is available:

1. Navigate to the page with the new feature
2. Walk through the user flow
3. Check for console errors:

```js
// In Playwright evaluate
() => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => { errors.push(args.join(' ')); originalError(...args); };
  return errors;
}
```

4. Verify the UI renders correctly

### Step 5: Console Error Check

Monitor the browser console during interaction:
- No `TypeError` or `ReferenceError`
- No React warnings (missing keys, prop type mismatches)
- No network errors (404s, 500s)
- No unhandled promise rejections

## Quick Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes  
- [ ] `npm run test` passes
- [ ] Browser loads without console errors
- [ ] User flow works as expected
- [ ] No React warnings in console
