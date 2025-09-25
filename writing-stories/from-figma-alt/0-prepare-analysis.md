# Prepare Screen Analysis

This prompt prepares all screens and notes from a Figma design file for analysis by creating a logical ordering system and stub analysis files.

## Instructions

You are tasked with preparing screen designs and notes from a Figma design file for analysis. Follow these steps:


### 1. Create Directory Structure

Create the necessary directories:
- `<project-home>/.results/screens/` folder

Use the `create_directory` tool to create this folder structure. Notice the `.` in `.results`.

### 2. Get All Layers from Figma

First, use the `mcp_figma-download_get-layers-for-a-page` tool to retrieve all layers from the provided Figma URL:

```
Input: Figma URL (e.g., "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=235-75405")
```

This will return a list of all layers with their metadata including:
- `id`: Unique identifier for the layer
- `name`: Human-readable name of the layer
- `type`: Type of layer (FRAME, INSTANCE, etc.)
- `absoluteBoundingBox`: Position and dimensions with x, y, width, height
- `downloadUrl`: Direct Figma URL for the layer


### 3. Determine Logical Flow Order

Filter the layers to find all items where `type === "FRAME"`. These represent the main screen designs.

**Auto-detect flow order** using screen names and positions:
1. Analyze the `absoluteBoundingBox` coordinates (x, y) for all frame layers
2. Look at the overall layout pattern to determine if screens are arranged:
   - **Left-to-right, top-to-bottom**: Sort by Y-coordinate first (rows), then X-coordinate (columns within rows)
   - **Top-to-bottom, left-to-right**: Sort by X-coordinate first (columns), then Y-coordinate (rows within columns)
3. Use screen names as additional context clues for logical flow
4. Group screens that appear to be at similar Y or X positions (within reasonable tolerance)

**Algorithm:**
1. Analyze screen naming patterns and their positions to determine layout flow
2. If screens with similar names are arranged horizontally (going to the right), likely "top-to-bottom, left-to-right"
3. If screens with similar names are arranged vertically (going down), likely "left-to-right, top-to-bottom"
4. Sort accordingly and create the ordered list

### 4. Create screens.yaml File

Write out a `<project-home>/.results/screens/screens.yaml` file with the determined flow order:

```yaml
# Screen flow order determined from Figma layout
order: "left-to-right, top-to-bottom"  # or "top-to-bottom, left-to-right"
screens:
  - applicants-new
  - applicants-in-progress
  - applicants-pending
  - applicants-complete
  - application-details
  - application-checks
  - application-map
  # ... etc in logical flow order
```

**YAML Structure:**
- `order`: The detected flow pattern as a string
- `screens`: Array of screen names (layer names converted to kebab-case: spaces to hyphens, lowercase)

### 5. Create Stub Analysis Files

For each frame-type layer, create a stub analysis file at `<project-home>/.results/screens/{layer-name-without-spaces}.analysis.md`:

**File naming convention:**
- Convert layer name to kebab-case: spaces to hyphens, lowercase
- Example: "Application - agreement - fixed - sent" → `application-agreement-fixed-sent.analysis.md`

**File content template:**
```markdown
# Screen: {layer name}

- Figma Node Url: `{layer.downloadUrl}`
```

### 6. Process and Associate Note Instances

Filter the layers to find all items where `type === "INSTANCE"` and `name === "Note"`. These represent design annotations and comments.

For each note instance:

1. **Calculate proximity**: Use the `absoluteBoundingBox` coordinates to determine which screen this note is closest to:
   - Note position: `note.absoluteBoundingBox.x` and `note.absoluteBoundingBox.y`
   - Screen position: `screen.absoluteBoundingBox.x` and `screen.absoluteBoundingBox.y`
   - Calculate distance using: `Math.sqrt((note.x - screen.x)² + (note.y - screen.y)²)`
   - Find the screen with the minimum distance

2. **Get note content**: Use `mcp_figma-download_get-figma-image-download` to get the note's image data and extract any visible text content. Do not write the text content to chat. It will be written to a file in the next step. 

3. **Create/append to markdown file**: 
   - Create a file named `{screen-name}.notes.md` in the `<project-home>/.results/screens/` folder
   - If the file already exists, append to it
   - Use this format:

```markdown
## Note {note-id}

{note-content-text}
```

Continue until you have processed ALL notes. Verify you have created all notes and then list all the notes you have created to the user.


### 7. File Naming Conventions

**Screen analysis stub files:**
- Location: `<project-home>/.results/screens/{screen-name}.analysis.md`
- Example: `<project-home>/.results/screens/application-agreement-fixed-sent.analysis.md`

**Note files:**
- Location: `<project-home>/.results/screens/{screen-name}.notes.md`
- Example: `<project-home>/.results/screens/application-agreement-fixed-sent.notes.md`

**Note markdown format:**
```markdown
## Note {note-id}

{extracted-note-text}

## Note {another-note-id}

{another-note-text}
```

### 8. Error Handling

- **If screens can't be ordered logically**: Inform the user that they need to manually specify the ordering in the `screens.yaml` file
- **If note content cannot be read**: Include placeholder text: `[Note content could not be extracted]`
- **If a note cannot be associated with a screen**: Create a separate `unassociated-notes.md` file
- Ensure all directories exist before attempting file creation

### 9. Summary Report

After completion, provide a summary including:
- Detected flow order and reasoning
- Total number of screens found and ordered
- Total number of notes processed and associated
- List of all created files
- Any errors or manual intervention needed

## Example Usage

```
User: "Prepare analysis for https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=235-75405"

Expected output:
- <project-home>/.results/screens/screens.yaml
- <project-home>/.results/screens/applicants-new.analysis.md
- <project-home>/.results/screens/applicants-in-progress.analysis.md
- <project-home>/.results/screens/application-details.analysis.md
- <project-home>/.results/screens/application-details.notes.md
- ... (additional analysis stub files and note files)
```

## Tools Used

- `mcp_figma-downloa_get-layers-for-a-page`: Get all layers from Figma page
- `mcp_figma-download_get-figma-image-download`: Download note images for text extraction
- `create_directory`: Create folder structure
- `create_file`: Create YAML file, analysis stubs, and note files
- `replace_string_in_file`: Append to existing note files when multiple notes associate to same screen