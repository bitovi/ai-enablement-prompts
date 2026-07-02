# Storybook LWC Profile

Use this reference when the repo has Storybook stories for LWC components.

Discovery:

- Read `.storybook/*` to understand framework setup, global decorators, static asset paths, and preview styles.
- Read nearby stories to match template style, args, argTypes, controls, decorators, layout parameters, and event logging.
- Identify the generated story id before using browser automation.

Story authoring:

- Add controls for public props that change rendered output.
- Keep default args close to the canonical Figma state.
- Add explicit stories for important variants, disabled states, selected/open states, icon states, and size states.
- Use a comparison story when Figma has several variants that need side-by-side review.
- Avoid adding explanatory in-app text that is not part of the component state being demonstrated.

Verification:

- Start Storybook with the repo's script only when it is not already running for the target repo.
- After edits, prefer HMR and browser refresh over rebuilding Storybook repeatedly.
- Check browser console messages and failed network requests.
- Inspect computed styles for values where visual matching matters.
- Capture screenshots for the implemented state and any high-risk variants.
