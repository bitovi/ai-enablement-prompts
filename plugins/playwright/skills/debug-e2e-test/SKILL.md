---
name: debug-e2e-test
description: Debug and fix failing Playwright E2E tests. Use when tests fail, when asked to fix failing tests, or when investigating test failures. Analyzes test output, screenshots, error context, and uses Playwright MCP to identify root causes.
---

# Skill: Debug E2E Test

Systematic workflow for debugging and fixing failing Playwright E2E tests.

## When to Use

- A Playwright E2E test is failing
- Asked to fix a failing test
- Investigating why tests are broken
- Tests pass locally but fail in CI

## Debugging Workflow

### Step 1: Run the Specific Failed Test

Run ONLY the specific failing test:

```bash
npx playwright test <test-file>.spec.ts -g "test name"
```

### Step 2: Analyze the Test Output

Extract from terminal output:
1. **Test location**: File path and line number
2. **Failure type**: What assertion failed
3. **Expected vs Actual**: What the test expected vs what it got
4. **Error message**: The specific error
5. **Artifact paths**: Screenshot and error-context locations

### Step 3: Load the Screenshot

Use the screenshot from test results to see the visual state at failure time.

### Step 4: Read the Error Context

Read any `error-context.md` file from test results:
- DOM snapshot
- Console logs
- Network errors

### Step 5: Read the Test Code

Understand what the test is trying to do, what selectors it uses, and what assertions it makes.

### Step 6: Compare Test Expectations with Implementation

```bash
grep -r "text the test looks for" src/ --include="*.tsx"
```

Check: routes, text content, element types, selectors.

### Step 7: Use Playwright MCP (If Needed)

If artifacts don't reveal the issue:
1. Navigate to the page
2. Take a screenshot
3. Get visible HTML
4. Interact with elements
5. Inspect behavior

### Step 8: Fix the Issue

Fix the test, the code, or both.

### Step 9: Verify the Fix

```bash
npx playwright test <test-file>.spec.ts -g "test name"
```

## Intermittent Failures — Non-Deterministic Data

If tests pass sometimes and fail other times:

### Common Causes
1. Sample generators using `Date.now()` or `new Date()`
2. Missing seeds in mock handlers
3. Stories without seeds

### How to Diagnose
```bash
npx playwright test <file>.spec.ts -g "test name"
npx playwright test <file>.spec.ts -g "test name"
# If results differ, you have non-deterministic data
```

### How to Fix
1. Update sample generators to use seeds
2. Add seeds everywhere — never call sample functions without seeds

## Tips
1. Always run the single test first
2. Start with artifacts — screenshot + error-context tell you 90% of issues
3. Use MCP sparingly
4. Check obvious things first — routes, text, element types
5. One test at a time
