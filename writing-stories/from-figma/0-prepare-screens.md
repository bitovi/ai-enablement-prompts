# Prepare Screens

This prompt prepares screen designs and notes from a Figma design file by creating a logical ordering system and structured YAML file with screen and note URLs.

## Instructions

You are tasked with preparing screen designs and notes from a Figma design file for analysis. Follow these steps:

### 1. Create Directory Structure

Create the necessary directories:
- `<project-home>/.results/screens/` folder

Use the `create_directory` tool to create this folder structure. Notice the `.` in `.results`.

### 2. Get All Layers from Figma

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

### 3. Filter Screen Frames and Note Instances

**Filter for screen frames:**
- Find all items where `type === "FRAME"` - these represent the main screen designs

**Filter for note instances:**
- Find all items where `type === "INSTANCE"` and `name === "Note"` - these represent design annotations and comments

### 4. Determine Logical Flow Order

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

### 5. Associate Notes with Screens

For each note instance, determine which screen it belongs to:

1. **Calculate proximity**: Use the `absoluteBoundingBox` coordinates to determine which screen this note is closest to:
   - Note position: `note.absoluteBoundingBox.x` and `note.absoluteBoundingBox.y`
   - Screen position: `screen.absoluteBoundingBox.x` and `screen.absoluteBoundingBox.y`
   - Calculate distance using: `Math.sqrt((note.x - screen.x)² + (note.y - screen.y)²)`
   - Find the screen with the minimum distance

2. **Group notes by screen**: Create a mapping of each screen to its associated note URLs

3. **Handle unassociated notes**: If a note cannot be clearly associated with a screen (too far away), create a separate list for unassociated notes

### 6. Create screens.yaml File

Write out a `<project-home>/.results/screens/screens.yaml` file with the determined flow order and note associations:

**Name Processing:**
For each screen, convert the original Figma layer name to a file-safe format:
- Convert to lowercase
- Replace spaces and special characters with hyphens
- Remove multiple consecutive hyphens
- Examples:
  - "Home Dashboard" → `home-dashboard`
  - "User Profile - Settings" → `user-profile-settings`
  - "Application Form (Step 1)" → `application-form-step-1`

```yaml
# Screen flow order determined from Figma layout
order: "left-to-right, top-to-bottom"  # or "top-to-bottom, left-to-right"
screens:
  - name: "home-dashboard"
    url: "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=246-3414"
    notes:
      - "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=247-3420"
      - "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=247-3421"
  - name: "user-profile"
    url: "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=246-3415"
    notes: []
  - name: "settings-page"
    url: "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=246-3416"
    notes:
      - "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=247-3422"
# Unassociated notes (if any)
unassociated_notes:
  - "https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=247-3423"
```

**YAML Structure:**
- `order`: The detected flow pattern as a string
- `screens`: Array of screen objects, each containing:
  - `name`: File-safe screen name (converted from original layer name)
  - `url`: Direct Figma URL to the screen frame (`downloadUrl` from the layer)
  - `notes`: Array of Figma URLs to associated note instances
- `unassociated_notes`: Array of note URLs that couldn't be clearly associated with a specific screen

### 7. File Naming and URL Structure

**Screen naming:**
- Convert the original layer name to file-safe format for the `name` field in YAML
- Use consistent naming that can be directly used as file names in subsequent steps

**URL handling:**
- Use the exact `downloadUrl` provided by the Figma API for each layer
- Ensure URLs point to the specific node/frame, not the general file

### 8. Error Handling

- **If screens can't be ordered logically**: Use the original order from Figma API and set order to "figma-api-order"
- **If note association is ambiguous**: Include notes in the closest screen and add a comment in the YAML
- **If no notes are found**: Set `notes: []` for screens with no associated notes
- **If unassociated notes exist**: Include them in the `unassociated_notes` section
- Ensure all directories exist before attempting file creation

### 9. Summary Report

After completion, provide a summary including:
- Detected flow order and reasoning
- Total number of screens found and ordered
- Total number of notes processed and associated
- Number of unassociated notes (if any)
- List of all created files
- Any errors or manual intervention needed

## Example Usage

```
User: "Prepare screens for https://www.figma.com/design/yRyWXdNtJ8KwS1GVqRBL1O/User-onboarding-designs?node-id=235-75405"

Expected output:
- <project-home>/.results/screens/screens.yaml (with structured screen and note data)
```

## Tools Used

- `mcp_figma-downloa_get-layers-for-a-page`: Get all layers from Figma page
- `create_directory`: Create folder structure
- `create_file`: Create YAML file with screen and note structure