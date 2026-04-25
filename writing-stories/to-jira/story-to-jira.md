This prompt creates Jira stories from markdown files. It takes:

- <project-key> - The project the story should be created within
- <jira-site-id> - An optional jira-site-id 

It should read `<project-root>/.results/stories/shell-stories.md` and use it to create the epic's summary. See `<project-root>/writing-stories/from-figma/4-shell-stories.md`.

The epic should have the following sections:

```md
## Problem

A description of what problem this is trying to solve

## Impact

How success will be measured

## Solution

A high level description of the solution.

## User Journies

The major user journies the epic supports.

## References

- Links to the figma design

## Shell Stories

The list of the shell stories
```


The epic should be created in the <project-key> project.

Then each story in `<project-root>/.results/stories/{story}.md` should be created as a child of the epic.  


