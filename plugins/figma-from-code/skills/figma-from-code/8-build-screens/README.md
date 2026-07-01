# Screen Assembly (Phase 4)

Builds full-page screen frames in Figma by composing already-built component instances into page layouts. Each screen assembles navigation, content panels, sidebars, and other regions using instances of components created in Phase 3, then validates them visually against app screenshots with up to 3 fix passes.

## What It Does

The orchestrator dispatches one subagent per screen. Subagents run in parallel since they only instantiate — never modify — Phase 3 components. Each subagent creates a screen frame (default 1440×900, both axes fixed), populates it with component instances matching the app's default view, and iterates on visual accuracy until the result matches the real application.

Screens that existed in the Figma file before this run are never modified without explicit user authorization. If a screen name collides with a pre-existing screen, the subagent writes a `needs_authorization` status and stops.

## How It Works

Each subagent runs through a fixed sequence of steps for its assigned screen.

### Prerequisite Check

Before any work begins, the subagent verifies that every component referenced by the screen exists in the `builtComponents` map from Phase 3. If any component is missing, the screen is rejected immediately. There are no "best effort" partial builds — a screen either has everything it needs or it doesn't start.

### Screenshot-First Analysis

The subagent studies the app screenshot FIRST, then reads the page source code. This order matters. Source code contains components behind conditional branches — modals, detail panels, edit modes — that aren't visible in the default state. By starting with the screenshot, the subagent learns what the user actually sees and only includes those components.

During analysis the subagent also identifies layout direction, sizing, spacing, background colors, and which variant of each child component is rendered in the default view.

### Build, Compare, and Fix

The subagent creates the screen frame in Figma, places component instances with correct variant resolution, applies layout properties, maps Tailwind classes to Figma properties, and resolves colors to variables.

After building, it captures a screenshot of the Figma screen and runs three checks: structural content match (do the right components appear?), sizing sanity check, and pixel diff against the app screenshot (threshold: ≥88%).

If the pixel diff reveals mismatches, the subagent enters a fix loop — up to 3 iterations of diagnose, fix, re-screenshot, and re-compare. Once the screen passes or exhausts its fix attempts, the subagent writes a tracking file into the page's source directory and outputs its results.

## Inputs

- All components built in Phase 3 with the `builtComponents` map available
- Pre-captured full-page app screenshots and text content from Phase 2.5
- Figma file key and Screens container frame node ID
- Page source files for layout structure analysis

## Outputs

- `build-results/screens/{screenName}.json` — per-screen result with status, node ID, and match score
- `build-screens.json` — aggregate results collected by the orchestrator
- `{pagesRoot}/{PageComponent}/figma-screen.json` — tracking files written into each page's source directory

## Why It Matters

This is where individual components come together into complete page designs. Each screen is a real composition of real component instances, not a mock-up. The visual comparison against app screenshots validates that the assembled pages look like the actual running application, proving the component library works as an integrated system.
