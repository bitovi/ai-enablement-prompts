# Prepare Notes

This prompt processes note images from Figma URLs listed in the screens.yaml file and creates note files with extracted text content.

## Instructions

You are tasked with downloading note images from Figma and extracting their text content to create note files. Follow these steps:

### 1. Read Screen Configuration

First, read the `<project-home>/.results/screens/screens.yaml` file to get the list of screens and their associated notes.

The YAML structure contains:
```yaml
order: "left-to-right, top-to-bottom"
screens:
  - name: "home-dashboard"
    url: "https://www.figma.com/design/..."
    notes:
      - "https://www.figma.com/design/..."
      - "https://www.figma.com/design/..."
  - name: "user-profile"  
    url: "https://www.figma.com/design/..."
    notes: []
unassociated_notes:
  - "https://www.figma.com/design/..."
```

### 2. Process Notes for Each Screen

For each screen that has notes (where `notes` array is not empty):

#### Step A: Use Screen Name from YAML

Use the screen name directly from the YAML file (already in file-safe format):
- The `name` field in screens.yaml is already converted to file-safe format
- Use this name directly for file naming
- Examples from YAML:
  - `name: "home-dashboard"` → file: `home-dashboard.notes.md`
  - `name: "user-profile-settings"` → file: `user-profile-settings.notes.md`
  - `name: "application-form-step-1"` → file: `application-form-step-1.notes.md`

#### Step B: Download and Process Each Note

For each note URL associated with the screen:

1. **Extract node ID**: Parse the Figma URL to get the node ID (e.g., "247-3420")
2. **Download note image**: Use `mcp_figma-download_get-figma-image-download` with:
   - `url`: The base Figma file URL (without node-id parameter)
   - `nodeId`: The extracted node ID
   - `format`: "png"
   - `scale`: 1
3. **Extract text content**: Analyze the downloaded image to extract any visible text content
4. **Handle extraction failures**: If text cannot be extracted, use placeholder: `[Note content could not be extracted from image]`

#### Step C: Create or Append to Note File

Create a note file at `<project-home>/.results/screens/{screen-name}.notes.md` (using the name directly from YAML):

**File content format:**
```markdown
# Notes for {screen-name}

## Note {node-id}

**Source:** {figma-note-url}

{extracted-note-text-content}

## Note {another-node-id}

**Source:** {another-figma-note-url}

{another-extracted-note-text-content}
```

**File handling:**
- If the file doesn't exist, create it with the full structure
- If the file exists, append the new note section to it
- Ensure proper markdown formatting and spacing

### 3. Process Unassociated Notes

If there are `unassociated_notes` in the YAML file:

1. Create a file at `<project-home>/.results/screens/unassociated-notes.md`
2. Process each unassociated note using the same download and text extraction process
3. Use this format:

```markdown
# Unassociated Notes

These notes could not be clearly associated with a specific screen during the preparation phase.

## Note {node-id}

**Source:** {figma-note-url}

{extracted-note-text-content}
```

### 4. Error Handling (CONTINUE ON ERRORS)

**MANDATORY CONTINUATION**: If any individual note fails, document the error and continue processing the remaining notes.

- **Failed image downloads**: Log the error, include placeholder text in the note file, and **CONTINUE** with next note
- **Failed text extraction**: Use placeholder text `[Note content could not be extracted from image]` and **CONTINUE**
- **Invalid URLs**: Log the error, include error message in note file, and **CONTINUE**
- **Missing screens.yaml**: Stop processing and inform user that screens must be prepared first

**NEVER** stop processing due to individual note failures. The goal is to process as many notes as possible.

### 5. Performance Considerations

- Process notes **one at a time** to avoid overwhelming the Figma API
- Group processing by screen to create complete note files
- Handle rate limiting gracefully if it occurs

### 6. File Management

**Note files created:**
- Location: `<project-home>/.results/screens/{screen-name}.notes.md` (using name from YAML)
- One file per screen that has notes
- Additional file: `<project-home>/.results/screens/unassociated-notes.md` (if unassociated notes exist)
- **REQUIREMENT**: Every screen with notes must have a corresponding note file

### 7. Summary Report (MANDATORY)

**REQUIRED**: After processing ALL notes, provide a detailed summary including:
- **COMPLETE INVENTORY**: List every screen processed and its note file status
- Total number of screens with notes
- Total number of individual notes processed successfully
- **FAILURE REPORT**: List of any notes that couldn't be processed with specific error reasons
- List of all created note files
- **ACTION ITEMS**: Specific steps needed to complete any failed note processing

## Critical Requirements

1. **PROCESS ALL NOTES**: Process every note URL listed in screens.yaml - no exceptions
2. **Resilient execution**: Continue processing even if individual notes fail
3. **Text extraction**: Extract readable text content from note images
4. **Proper file naming**: Use screen names directly from YAML (already file-safe)
5. **Complete documentation**: Create well-structured markdown files with proper headers
6. **Error documentation**: Log all failures with specific error messages
7. **Mandatory reporting**: Provide complete inventory of success/failure for every note

## Verification Checklist

Before completing the task, verify:
- [ ] Every screen with notes has a corresponding note file
- [ ] Every note URL has been processed (successfully or with documented failure)
- [ ] All created files use proper markdown formatting
- [ ] Summary report lists all files created and any failures
- [ ] Unassociated notes file is created if needed

## Example Usage

```
User: "Prepare notes from screens.yaml"

Expected process:
1. Read <project-home>/.results/screens/screens.yaml
2. For each screen with notes:
   - Download each note image from Figma
   - Extract text content 
   - Create/update {screen-name}.notes.md file
3. Process any unassociated notes
4. Provide summary report

Expected output:
- <project-home>/.results/screens/home-dashboard.notes.md
- <project-home>/.results/screens/user-profile.notes.md
- <project-home>/.results/screens/unassociated-notes.md (if applicable)
- Summary report of all processing results
```

## Tools Used

- `read_file`: Read screens.yaml configuration
- `mcp_figma-download_get-figma-image-download`: Download note images from Figma
- `create_file`: Create new note files
- `replace_string_in_file`: Append to existing note files when multiple notes exist for same screen