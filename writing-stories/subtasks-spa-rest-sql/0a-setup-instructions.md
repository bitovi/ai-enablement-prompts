In /understanding-code/instruction-generation, we have instruction generation prompts.


However, these don't necessarily generate instructions that relate to the subtasks we are creating (migrations, service-layer, and frontend).

This prompt should check if instructions exist, if they don't suggest using the 

`/understanding-code/instruction-generation` prompts. 


If there is an existing instructions file, this prompt should read it and make sure it has the right details so effective technical subtasks can be created.

If it doesn't have the right level of detail, it should add it. 