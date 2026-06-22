# LWC Storybook Package Profile

Use this reference when the repo resembles a package-style LWC Storybook project.

Common files and folders:

- `package.json`
- `src/modules/c/<componentName>/<componentName>.js`
- `src/modules/c/<componentName>/<componentName>.html`
- `src/modules/c/<componentName>/<componentName>.css`
- `stories/<ComponentName>.stories.js`
- `src/index.js`
- `src/register.js`

Discovery:

- Read `package.json` scripts before running commands.
- Read `src/index.js` and `src/register.js` before adding a component.
- Read nearby `src/modules/c/*` components to match folder names, exports, event names, and CSS style.
- Read nearby stories to match render helpers, argTypes, decorators, and story naming.

Implementation:

- Register new components in `src/index.js` and `src/register.js` only when those files are part of the current repo pattern.
- Add Storybook controls for public props that affect the design.
- Include one story per important Figma variant or state.
- Add an `AllVariants`, `Comparison`, or equivalent story when useful for review.
- If Figma shows an expanded blueprint state, expose a controlled prop such as `open` when appropriate and add a matching story.

Verification:

- Check whether Storybook is already running before starting it.
- If a Storybook dev server is running for the target repo, reuse it and rely on HMR after edits.
- Use browser automation to navigate to the component story, exercise key states, inspect computed styles when needed, and capture screenshots.
- Run the repo's LWC build and Storybook build when visual verification is unavailable.
