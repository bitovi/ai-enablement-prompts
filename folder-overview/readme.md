## Folder Overview Prompt

This is an AI prompt. 

This AI prompt generates an overview of the contents for each subfolder in a directory. It also generates an single overview for all the subfolders.

## Use

To use this prompt, write something similar to the following in copilot:

```
Run the github project `bitovi/ai-enablement-prompts`'s  `folder-overview` prompts on the src/react folder.
```

## Agent Capabilities

The AI agent is expected to have the following capabilities:

- Read and write files
- Read and write folders


## Parameters 

This prompt is expected to be provided the following:

- {INPUT_FOLDER} - A path to the folder whose subfolders will be given an overview. 


## Execution

When given an {INPUT_FOLDER} perform the following, please read the following files and follow their instructions in order:

- [./1-folder-overview.md](./1-folder-overview.md)
- [./2-folder-overview.md](./2-folder-overview.md)
- [./3-folder-overview.md](./3-folder-overview.md)

and provide each prompt the {INPUT_FOLDER}.
