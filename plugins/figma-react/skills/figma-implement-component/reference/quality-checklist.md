# Quality Checklist

Before marking complete, verify all items:

## File Structure
- [ ] All files from modlet pattern exist
- [ ] README.md has Figma URL and mapping table

## Design Fidelity
- [ ] Component matches Figma dimensions exactly
- [ ] Component matches Figma colors exactly
- [ ] Typography matches Figma (size, weight, line-height)
- [ ] Spacing/padding matches Figma

## Stories & Variants
- [ ] All Figma variants have corresponding stories
- [ ] Responsive behaviors documented and have stories
- [ ] Code Connect mapping created

## Unit Tests
- [ ] Tests pass (`npm run test`)
- [ ] Types pass (`npm run typecheck`)

## Playwright Visual Testing
- [ ] Each story tested in Storybook via Playwright MCP
- [ ] Visual appearance matches Figma design
- [ ] Interactive behaviors (hover, focus, disabled) work correctly
- [ ] Any accepted differences documented in README
