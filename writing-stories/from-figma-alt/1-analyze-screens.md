# Analyze Screens

You are a UX analyst tasked with creating detailed documentation of individual screen designs. This prompt processes screens in their logical flow order by loading images directly from Figma and performing comprehensive analysis.

## Instructions

You are tasked with analyzing prepared screen designs in their logical flow order. Follow these steps:

### 1. Read Screen Flow Order

First, read the `<project-home>/.results/screens/screens.yaml` file to get the ordered list of screens to process.

The YAML structure contains:
```yaml
order: "left-to-right, top-to-bottom"  # or "top-to-bottom, left-to-right"
screens:
  - screen-name-1
  - screen-name-2
  # ... etc
```

**CRITICAL REQUIREMENT**: Process ALL screens in sequence. You MUST complete analysis for EVERY screen listed in the YAML file. Do not stop until all screens are processed.

### 2. For Each Screen in Order (MANDATORY - ALL SCREENS)

**ENFORCEMENT RULE**: For each screen listed in the `screens.yaml` file, you MUST:
1. Attempt to load and analyze the screen
2. If any step fails, document the failure and continue to the next screen
3. Do NOT stop processing remaining screens due to individual failures
4. Provide a final report showing which screens were successfully analyzed and which failed

For each screen listed in the `screens.yaml` file:

#### Step A: Load Image from Figma

1. Read the existing stub analysis file: `<project-home>/.results/screens/{screen-name}.analysis.md`
2. Extract the Figma Node URL from the file
3. Extract the node ID from the URL (e.g., "246:3414" from the URL)
4. Use `mcp_figma-download_get-figma-image-download` with:
   - `url`: The original Figma file URL  
   - `nodeId`: The extracted node ID
   - `format`: "png"
   - `scale`: 1

This loads the image directly into the agent's memory and returns a response object with an `imageUrl` field.

#### Step B: Update Analysis File with Image URL

Update the analysis file to include the temporary image URL:

```markdown
# Screen: {layer name}

- Figma Node Url: `{layer.downloadUrl}`
- Figma Image Url: `{figma-image-download-result.imageUrl}`
```

#### Step C: Read Associated Notes

Check for an associated notes file (`{screen-name}.notes.md`) in `<project-home>/.results/screens/`. If it exists, read its contents for additional context during analysis.

#### Step D: Perform Comprehensive Analysis

Analyze the loaded image and update the analysis file with detailed documentation using the following structure:

```markdown
# Screen: {layer name}

- Figma Node Url: `{layer.downloadUrl}`
- Figma Image Url: `{figma-image-download-result.imageUrl}`

## Design Notes & Annotations
If a notes file exists, summarize key design decisions and requirements:
- **Behavioral Requirements:** Specific functionality described in notes
- **Performance Considerations:** Loading, pagination, or performance notes
- **Business Rules:** Validation rules, user permissions, data requirements
- **Implementation Notes:** Technical considerations or constraints
- **UX Guidelines:** Specific user experience requirements

## Page Structure
- **Header/Navigation:** Describe top-level navigation, branding, search, user controls
- **Page Title:** Main heading and any subtitle/description
- **Layout:** Overall page structure (sidebar, main content, etc.)

## Primary UI Elements
Document every visible element:
- **Buttons:** List all buttons with their labels and visual states (primary, secondary, disabled)
- **Tabs/Filters:** Status filters, navigation tabs, toggle controls
- **Form Controls:** Inputs, dropdowns, checkboxes, radio buttons
- **Navigation:** Pagination, breadcrumbs, back/forward controls
- **Actions:** Click targets, hover states, interactive elements

## Data Display
- **Table Structure:** Column headers, data types, sortable indicators
- **Data Fields:** All visible data columns and their content types
- **Visual Indicators:** Status badges, icons, color coding
- **Empty States:** How missing/null data is displayed

## Interactive Behaviors (Implied)
Based on visual cues and any notes provided, document likely behaviors:
- **Clickable Elements:** What appears to be clickable and where it might lead
- **Sorting:** Which columns appear sortable (arrows, styling)
- **Filtering:** How filters appear to work
- **State Changes:** Selected vs unselected states
- **Progressive Disclosure:** Expandable sections, hover details
- **Note-Specified Behaviors:** Any specific interactions described in design notes

## Content & Data
- **Sample Data:** What type of information is displayed
- **Data Patterns:** Formats for dates, names, statuses, etc.
- **Content Hierarchy:** Visual emphasis and organization

## Unique Features
- **Screen-Specific Elements:** Features that don't appear in other screens
- **Advanced Functionality:** Complex controls or specialized widgets
- **Differences:** How this screen differs from related screens

## Technical Considerations
- **Responsive Indicators:** Mobile/tablet considerations visible
- **Performance Implications:** Large data sets, complex interactions
- **Accessibility:** Visible accessibility features
```

### 3. Analysis Guidelines

- **Read notes first:** Always check for and read `{screen-name}.notes.md` before analyzing the screen
- **Integrate note content:** Incorporate design notes into relevant sections of your analysis
- **Cross-reference:** Use notes to validate or expand on visual observations
- Be exhaustive in documenting every visible element
- Include exact labels, button text, column headers
- Note visual states (active, hover, disabled, selected)
- Describe layout and spacing patterns
- Capture data types and formats shown
- Identify potential user workflows
- Note any error states or validation visible
- Document loading states or empty states shown
- **Distinguish sources:** Clearly indicate what comes from visual analysis vs. design notes

### 4. Error Handling (CONTINUE ON ERRORS)

**MANDATORY CONTINUATION**: If any individual screen fails, document the error and continue processing the remaining screens.

- **Failed image downloads**: Log the error, note in analysis file that image could not be loaded, create a basic analysis file with available information, and **CONTINUE** with next screen
- **Missing analysis stub files**: Create a new analysis file with basic structure and **CONTINUE**
- **Missing or corrupted YAML**: Inform user that screens.yaml needs to be fixed or recreated, but **STOP ONLY** if YAML cannot be read at all
- **Missing notes files**: Continue analysis without notes integration
- **Any other errors**: Document the error, attempt to create minimal analysis file, and **CONTINUE** with remaining screens

**NEVER** stop processing due to individual screen failures. The goal is to analyze as many screens as possible.

### 5. Performance Considerations

- Process screens **one at a time in sequence** to avoid overwhelming the Figma API
- Each screen gets fully analyzed before moving to the next
- **MANDATORY**: Complete ALL screens in the list before finishing
- This ensures proper flow order documentation and allows for cross-referencing between screens

### 6. File Management

**Updated analysis files:**
- Location: `<project-home>/.results/screens/{screen-name}.analysis.md`
- Contains complete analysis with image URLs and detailed documentation
- **REQUIREMENT**: Every screen in screens.yaml must have a corresponding analysis file (even if minimal due to errors)

**No new directories needed** - all work is done with existing file structure from the preparation step.

### 7. Summary Report (MANDATORY)

**REQUIRED**: After completing ALL screens, provide a detailed summary including:
- **COMPLETE INVENTORY**: List every screen from screens.yaml and its analysis status
- Total number of screens analyzed successfully
- **FAILURE REPORT**: List of any screens that couldn't be fully analyzed with specific error reasons
- Screen flow order that was followed
- Overview of the user journey based on screen flow
- Any patterns or inconsistencies noticed across screens
- **ACTION ITEMS**: Specific steps needed to complete any failed analyses

## Critical Requirements

1. **COMPLETE ALL SCREENS**: Process every single screen listed in `screens.yaml` - no exceptions
2. **Sequential processing**: Process screens one at a time in the order specified in `screens.yaml`
3. **Resilient execution**: Continue processing even if individual screens fail
4. **Image loading**: Load images directly into agent memory using `mcp_figma-download_get-figma-image-download`
5. **Notes integration**: Always check for and incorporate associated notes files
6. **Comprehensive analysis**: Use the full analysis structure adapted from the original methodology
7. **Flow awareness**: Consider the logical sequence when analyzing each screen
8. **Mandatory reporting**: Provide complete inventory of success/failure for every screen
9. **No early termination**: Do not stop processing due to individual failures

## Verification Checklist

Before completing the task, verify:
- [ ] Every screen in screens.yaml has been processed
- [ ] Every screen has an analysis file (even if minimal due to errors)
- [ ] Summary report lists all screens and their status
- [ ] Any failed screens are clearly documented with error reasons
- [ ] Action items are provided for completing any missing analyses

## Example Usage

```
User: "Analyze all prepared screens"

Expected process:
1. Read <project-home>/.results/screens/screens.yaml
2. Create a checklist of ALL screens to process
3. Process each screen in order (DO NOT SKIP ANY):
   - Load {screen-1} image → analyze → update analysis file
   - Load {screen-2} image → analyze → update analysis file  
   - Load {screen-3} image → analyze → update analysis file
   - Load {screen-4} image → analyze → update analysis file
   - ... continue for ALL screens in order
4. Provide final summary report showing status of every screen

Expected output:
- Updated <project-home>/.results/screens/{screen-1}.analysis.md (with full analysis)
- Updated <project-home>/.results/screens/{screen-2}.analysis.md (with full analysis)
- Updated <project-home>/.results/screens/{screen-3}.analysis.md (with full analysis)
- Updated <project-home>/.results/screens/{screen-4}.analysis.md (with full analysis)
- ... (ALL analysis files updated with comprehensive documentation)
```

## Tools Used

- `read_file`: Read screens.yaml and existing analysis stub files
- `mcp_figma-download_get-figma-image-download`: Load images directly into agent memory
- `replace_string_in_file`: Update analysis files with image URLs and complete analysis