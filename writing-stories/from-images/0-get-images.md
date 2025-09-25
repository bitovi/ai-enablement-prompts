# Get Images from Figma

This prompt downloads all screens and notes from a Figma design file using the figma-downloads MCP tools.

## Instructions

You are tasked with downloading all screen designs and notes from a Figma design file. Follow these steps:

### 1. Get All Layers from Figma

First, use the `mcp_figma-downloa_get-layers-for-a-page` tool to retrieve all layers from the provided Figma URL:

```
Input: Figma URL (e.g., "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=235-75405")
```

This will return a list of all layers with their metadata including:
- `id`: Unique identifier for the layer
- `name`: Human-readable name of the layer
- `type`: Type of layer (FRAME, INSTANCE, etc.)
- `absoluteBoundingBox`: Position and dimensions with x, y, width, height
- `downloadUrl`: Direct Figma URL for the layer

### 2. Create Directory Structure

Create the necessary directory:
- `{screens}` folder (defaults to `/.results/screens/`)

Use the `create_directory` tool to create this folder. Note images are processed directly from Figma responses and don't require local storage.

### 3. Download Frame Layers (Screens)

Filter the layers to find all items where `type === "FRAME"`. These represent the main screen designs.

**IMPORTANT: Download in batches** - Use parallel downloads by calling multiple `mcp_figma-download_get-figma-image-download` functions simultaneously. This significantly improves performance compared to sequential downloads.

For each frame layer:
1. Use `mcp_figma-download_get-figma-image-download` with these parameters:
   - `url`: The original Figma file URL
   - `nodeId`: The layer's `id` (e.g., "253:138467")
   - `format`: "png"
   - `scale`: 1

   **IMPORTANT**: This returns a response object containing an `imageUrl` field. Extract the `imageUrl` value from the response - this is the temporary download URL you'll use with curl.

2. Save each downloaded image to `{screens}` using `curl` commands in the terminal:
   - Convert layer name to filename: spaces to hyphens, lowercase, add `.png`
   - Example: "Application - agreement - fixed - sent" → `application-agreement-fixed-sent.png`
   - Use curl: `curl -o "{screens}/application-agreement-fixed-sent.png" "{imageUrl}"`

**Batch Strategy:** 
1. Call up to 10 `mcp_figma-download_get-figma-image-download` functions in parallel to get response objects
2. Extract the `imageUrl` field from each response object 
3. Save all images using parallel curl commands with the extracted imageUrls:
   ```bash
   curl -o "file1.png" "extracted_imageUrl_1" &
   curl -o "file2.png" "extracted_imageUrl_2" &
   curl -o "file3.png" "extracted_imageUrl_3" &
   wait
   ```

### 4. Process and Associate Note Instances

Filter the layers to find all items where `type === "INSTANCE"` and `name === "Note"`. These represent design annotations and comments.

For each note instance:

1. **Get note content**: Use `mcp_figma-download_get-figma-image-download` to get the response object with the note's image data and extract the text content

2. **Calculate proximity**: Use the `absoluteBoundingBox` coordinates to determine which screen this note is closest to:
   - Note position: `note.absoluteBoundingBox.x` and `note.absoluteBoundingBox.y`
   - Screen position: `screen.absoluteBoundingBox.x` and `screen.absoluteBoundingBox.y`
   - Calculate distance using: `Math.sqrt((note.x - screen.x)² + (note.y - screen.y)²)`
   - Find the screen with the minimum distance

3. **Create/append to markdown file**: 
   - Create a file named `{screen-name}.notes.md` in the `{screens}` folder
   - If the file already exists, append to it
   - Use this format:

```markdown
## Note {note-id}

{note-content-text}

```

### 5. File Naming Conventions

**Screen files:**
- Location: `{screens}/{screen-name}.png`
- Example: `/.results/screens/application-agreement-fixed-sent.png`

**Note files:**
- Markdown: `{screens}/{screen-name}.notes.md`
- Example: `/.results/screens/application-agreement-fixed-sent.notes.md`
- Note: Note images are processed directly from Figma responses, no local image files needed

**Note markdown format:**
```markdown
## Note {note-id}

{extracted-note-text}

## Note {another-note-id}

{another-note-text}
```

### 6. Expected Variables

The user may provide this variable, use default if not specified:

- `{screens}` - Directory for screen images (default: `/.results/screens/`)

### 7. Performance Optimization

**Batch Downloads:** Always download images in batches of 4-5 items simultaneously rather than sequentially. This dramatically reduces total download time.

**Example batch approach:**
```
1. Call 5 mcp_figma-download_get-figma-image-download functions in parallel to get response objects
2. Extract the imageUrl field from each response object
3. Use parallel curl commands to save all 5 images with the extracted imageUrls:
   curl -o "{screens}/file1.png" "{extracted_imageUrl1}" &
   curl -o "{screens}/file2.png" "{extracted_imageUrl2}" &
   curl -o "{screens}/file3.png" "{extracted_imageUrl3}" &
   curl -o "{screens}/file4.png" "{extracted_imageUrl4}" &
   curl -o "{screens}/file5.png" "{extracted_imageUrl5}" &
   wait
4. Repeat for next batch
```

**Two-step process:**
- Step 1: Get response objects from Figma using the MCP tool, then extract the `imageUrl` field from each response
- Step 2: Download files to local filesystem using curl commands with the extracted imageUrls

**Error Handling:**

- If a download fails, log the error and continue with remaining items
- If note content cannot be read, include placeholder text: `[Note content could not be extracted]`
- Ensure all directories exist before attempting downloads

### 8. Summary Report

After completion, provide a summary including:
- Total number of screens downloaded
- Total number of notes downloaded  
- List of all created files
- Any errors encountered

## Example Usage

```
User: "Download all images from https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=235-75405"

Expected output:
- /.results/screens/applicants-new.png
- /.results/screens/applicants-in-progress.png
- /.results/screens/application-details.png
- /.results/screens/application-details.notes.md
- ... (additional screen files and note markdown files)
```

## Tools Used

- `mcp_figma-downloa_get-layers-for-a-page`: Get all layers from Figma page
- `mcp_figma-download_get-figma-image-download`: Download individual images
- `create_directory`: Create folder structure
- `create_file`: Create markdown note files
- `replace_string_in_file`: Append to existing note files
