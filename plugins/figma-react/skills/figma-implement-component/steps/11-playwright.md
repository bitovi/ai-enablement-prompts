# Step 11: Playwright Visual Testing with MCP

Before starting: Mark Step 11 as `in-progress` in todo list.

Use Playwright MCP tools to verify each Storybook story matches the Figma design visually and behaviorally.

## Prerequisites

- Storybook running (start with `npm run storybook`)
- Figma screenshot from `mcp_figma_get_screenshot` for reference

## Test Each Story

For **every story** in the component's `.stories.tsx` file:

1. Navigate to the story URL: `{storybook-url}/iframe.html?id={story-id}&viewMode=story`
2. Take a snapshot to get the component structure and element references
3. Verify visually that the rendered component matches the corresponding Figma variant
4. Test interactions appropriate to the story

## What to Verify

Verify visual and interactive aspects based on the component. Examples:

- **Visual**: Layout, colors, typography, spacing match Figma
- **Hover**: Background/border changes on hover
- **Focus**: Focus ring visible with correct styling
- **Disabled**: Reduced opacity, cursor change, no interaction
- **Sizing**: Each size variant matches Figma dimensions

## Component-Specific Behaviors

Beyond visual states, test interactive behaviors appropriate to the component. Examples:

- **Select/Dropdown**: Click opens menu, selecting item closes menu and updates value
- **Accordion**: Click expands/collapses content
- **Modal/Dialog**: Opens on trigger, closes on backdrop click or close button
- **Tabs**: Clicking tab switches content

Determine what behaviors to test based on the component's purpose and the Figma design.

## Report Results

After testing all stories, document:
- Stories that match Figma
- Any accepted visual differences (add to README "Accepted Design Differences")
- Issues found that need fixing

After completion: Mark Step 11 as `completed` in todo list.

Final step: Provide summary to user only after all todos are marked completed.
