# Writing Stories

Prompt chains that turn Figma designs, screenshots, or plain images into development-ready user stories and Jira tickets.

| Folder | What it does |
|---|---|
| [`from-figma/`](./from-figma) | 5-step pipeline: Figma page → screen analysis → shell stories → full stories with Gherkin acceptance criteria |
| [`from-figma-alt/`](./from-figma-alt) | Alternate, shorter version of the `from-figma` pipeline |
| [`from-images/`](./from-images) | Same pipeline as `from-figma`, but starting from plain screenshots instead of a live Figma file |
| [`subtasks-spa-rest-sql/`](./subtasks-spa-rest-sql) | Work-in-progress prompts for splitting a user story into frontend/API/migration subtasks for a SPA + REST + SQL stack |
| [`to-jira/`](./to-jira) | Pushes a completed story into Jira as an epic plus child stories |

None of these are packaged as plugins yet — they remain standalone prompt chains. Each subfolder's `README.md` covers prerequisites and usage.
