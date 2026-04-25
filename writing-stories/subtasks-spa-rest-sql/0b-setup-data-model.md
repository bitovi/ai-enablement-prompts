We will need an awareness of the existing data model and be able to track changes across stories. 

What are ways that we can do this?


I've thought about using MCP to connect to the database directly.  But product owners, the likely users of these prompts might not have access.

Are there standard formats for SQL database schemas?


If one doesn't exist, would we be able to create prompts that do their best to recreate it?

Do different databases provide this functionaly?

We will need to write out the starting data model and then write out the data model for each story after that story's migrations. Then when we build subtasks for subsequent stories, it can reference the starting point.