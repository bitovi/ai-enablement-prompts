# Salesforce DX LWC Profile

Use this reference when the repo uses Salesforce DX project layout.

Common files and folders:

- `sfdx-project.json`
- `force-app/main/default/lwc/<componentName>/<componentName>.js`
- `force-app/main/default/lwc/<componentName>/<componentName>.html`
- `force-app/main/default/lwc/<componentName>/<componentName>.css`
- `force-app/main/default/lwc/<componentName>/<componentName>.js-meta.xml`

Discovery:

- Inspect nearby component metadata files before creating or changing `.js-meta.xml`.
- Check whether components are intended for app pages, record pages, home pages, screen flows, or internal composition only.
- Match existing public property exposure in metadata when adding `@api` props.
- Search for Apex imports, message channels, static resources, labels, and shared utility modules before inventing new integration points.

Implementation:

- Keep `.js-meta.xml` targets and properties aligned with actual intended usage.
- Avoid adding page targets or builder-exposed properties unless the design or user request requires them.
- Prefer existing shared components and utility modules when the repo already has them.
- Keep CSS scoped to the component unless the repo has an established shared styling layer.

Verification:

- Use the repo's existing lint, unit test, and deploy validation scripts when available.
- If no local visual preview exists, report that browser-level visual verification was unavailable and state which static checks passed.
