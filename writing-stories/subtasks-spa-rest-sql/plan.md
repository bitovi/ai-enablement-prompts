I help building a series of prompts that build out technical subtasks for user stories. The target architecture is:

- Single Page Apps apps that have
  - a Frontend that handles routing with components and a data layer that makes REST requests
  - A REST service layer that supports the CRUD capabilities necessary to support the application. Also, the service layer supports the ability to fetch lists of items with 
  some form of pagination, filtering, sorting, and relationship inclusion when needed.
  - The service layer uses some form of ORM to change data.
  - A SQL data layer based on tables.
  - A migration utility to change the data base.

It's expected that AI Agents like VSCode will implement these subtasks. I assume that Agents will have access to instructions and able to translate the abstraction to the right type of code. We should probably take as a parameter the codebase as the instructions. This will be useful. 

Each story will look like what's provided in `<project-root>/writing-stories/from-figma/write-story.md`. Besides the story itself, we will have access to the figma images and analysis files for every screen related to the story.  

I've started to fill out thoughts in the following files:


- `<project-root>/writing-stories/subtasks-spa-rest-sql/0a-setup-instructions.md`
- `<project-root>/writing-stories/subtasks-spa-rest-sql/0b-setup-data-model.md`
- `<project-root>/writing-stories/subtasks-spa-rest-sql/0c-setup-api-docs.md`
- `<project-root>/writing-stories/subtasks-spa-rest-sql/1-data-migrations.md`
- `<project-root>/writing-stories/subtasks-spa-rest-sql/2-api-changes.md`
- `<project-root>/writing-stories/subtasks-spa-rest-sql/3-frontend.md`


Please read these files to get a sense of what I'm thinking about. Eventually, you will update these files or create similar files.

After thinking about these goals.  I'd like you to update this document with any questions you have in the following `## Questions` section.  Below that, you'll find a `## Plan` section where you can start writing your ideas out on what prompts should exist and how they should work. 

## Questions


## Plan