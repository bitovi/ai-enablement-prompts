# Analyze Screens

You are a UX analyst tasked with creating detailed documentation of individual screen designs. This prompt processes screens in their logical flow order by loading images directly from Figma.
## Instructions

You are tasked with analyzing prepared screen designs in their logical flow order. Follow these steps:

### 1. Read Screen Configuration and Create Todo List

First, read the `<project-home>/.results/screens/screens.yaml` file to get the ordered list of screens to process.

**MANDATORY TODO CREATION**: After reading the screens.yaml file, you MUST create a comprehensive todo list with:
1. One todo item for reading the screens.yaml configuration 
2. **Individual todo items for EACH screen** listed in the YAML file (e.g., "Analyze home-dashboard screen", "Analyze user-profile screen", etc.)
3. One final todo item for providing the summary report

This ensures complete tracking of every screen analysis and prevents any screens from being skipped.

The YAML structure contains:
```yaml
order: "left-to-right, top-to-bottom"  # or "top-to-bottom, left-to-right" or "manual"
screens:
  - name: "home-dashboard"
    url: "https://www.figma.com/design/..."
    notes:
      - "https://www.figma.com/design/..."
  - name: "user-profile"
    url: "https://www.figma.com/design/..."
    notes: []
```

### 2. Create Individual Screen Analysis Todos

**CRITICAL REQUIREMENT**: Before beginning any analysis work, create individual todo items for EACH screen listed in the screens.yaml file. This ensures:
- Complete visibility of all screens that need processing
- Ability to track progress screen-by-screen
- Prevention of accidentally skipping screens
- Clear checkpoints for the user

**TODO STRUCTURE EXAMPLE**:
- [x] Read screens.yaml configuration
- [ ] Analyze home-dashboard screen
- [ ] Analyze user-profile screen  
- [ ] Analyze settings-page screen
- [ ] Analyze checkout-flow screen
- [ ] Provide final summary report

### 3. For Each Screen in Order (MANDATORY - ALL SCREENS)

**ENFORCEMENT RULE**: For each screen listed in the `screens.yaml` file, you MUST:
1. Mark the specific screen's todo as "in-progress" before starting
2. Attempt to load and analyze the screen
3. Mark the specific screen's todo as "completed" when finished
4. If any step fails, document the failure and STOP processing - do not continue to remaining screens
5. Only provide a final report if ALL screens are processed successfully

For each screen listed in the `screens.yaml` file:

#### Step A: Load Image from Figma

1. Use the screen name directly from screens.yaml (already file-safe)
2. Read the existing stub analysis file: `<project-home>/.results/screens/{screen-name}.analysis.md`
3. Extract the Figma Node URL from the screens.yaml (use the `url` field)
4. Extract the node ID from the URL (e.g., "246:3414" from the URL)
5. Use `mcp_figma-download_get-figma-image-download` with:
   - `url`: The base Figma file URL (without node-id parameter)
   - `nodeId`: The extracted node ID
   - `format`: "png"
   - `scale`: 1

This loads the image directly into the agent's memory and returns a response object with an `imageUrl` field.

#### Step B: Read Associated Notes

Check if the screen has associated notes by:
1. Looking at the `notes` array in the screens.yaml for this screen
2. If the notes array is not empty, read the corresponding notes file: `<project-home>/.results/screens/{screen-name}.notes.md`
3. Use the note content for additional context during analysis

#### Step C: Update Analysis File with Image URL

Replace the stub content with comprehensive analysis. Start with:

```markdown
# Screen: {screen-name}

- **Figma Node URL:** `{screen.url from YAML}`
- **Figma Image URL:** `{figma-image-download-result.imageUrl}`
- **Screen Order:** {position} of {total screens}
- **Has Notes:** {Yes/No based on notes array}

## Design Notes & Annotations
{If notes file exists, summarize key design decisions and requirements}
{If no notes file, state "No design notes available for this screen"}

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

#### Step D: Perform Comprehensive Analysis

Use the loaded image and any associated notes to fill in each section with detailed documentation. Follow these guidelines:

### 3. Analysis Guidelines

- **Read notes first:** Always check the screens.yaml and read associated notes file before analyzing the screen
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

### 4. Error Handling (STOP ON ERRORS)

**MANDATORY TERMINATION**: If any individual screen fails, document the error and STOP processing.

- **Failed image downloads**: Log the error, document the failure, and **STOP** processing remaining screens
- **Missing analysis stub files**: Report the error and **STOP** processing
- **Missing or corrupted YAML**: Inform user that screens.yaml needs to be fixed or recreated and **STOP** processing
- **Missing notes files**: This is acceptable - continue analysis without notes integration (this is normal if screen has no notes)
- **Invalid URLs in YAML**: Log the error and **STOP** processing
- **Any other errors**: Document the error and **STOP** processing remaining screens

**ALWAYS** stop processing when encountering screen failures. All screens must be processable for the analysis to be considered complete.

### 5. Performance Considerations

- Process screens **one at a time in sequence** to avoid overwhelming the Figma API
- Each screen gets fully analyzed before moving to the next
- **MANDATORY**: Complete ALL screens in the list before finishing
- This ensures proper flow order documentation and allows for cross-referencing between screens

### 6. File Management

**Updated analysis files:**
- Location: `<project-home>/.results/screens/{screen-name}.analysis.md` (using name from YAML)
- Contains complete analysis with image URLs and detailed documentation
- **REQUIREMENT**: Every screen in screens.yaml must have a corresponding analysis file (even if minimal due to errors)

**File naming consistency:**
- Screen names in YAML are already file-safe
- Analysis files use the same names as notes files automatically

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

1. **INDIVIDUAL TODOS FOR EACH SCREEN**: Create separate todo items for each screen analysis to ensure complete visibility and tracking
2. **COMPLETE ALL SCREENS**: Process every single screen listed in `screens.yaml` - no exceptions
3. **Sequential processing**: Process screens one at a time in the order specified in `screens.yaml`
4. **Todo progression**: Mark each screen's todo as in-progress before starting and completed when finished
5. **Fail-fast execution**: Stop processing immediately if any individual screen fails
4. **Image loading**: Load images directly into agent memory using `mcp_figma-download_get-figma-image-download`
5. **Notes integration**: Always check for and incorporate associated notes files when they exist
6. **Comprehensive analysis**: Use the full analysis structure for thorough documentation
7. **Flow awareness**: Consider the logical sequence when analyzing each screen
8. **Mandatory reporting**: Provide complete inventory of success/failure for every screen
9. **No early termination**: Do not stop processing due to individual failures
10. **Direct naming**: Use screen names directly from YAML (already file-safe)

## Verification Checklist

Before completing the task, verify:
- [ ] Individual todo items created for each screen in screens.yaml
- [ ] All screen todos marked as completed (successfully or with documented errors)
- [ ] Every screen in screens.yaml has been processed
- [ ] Every screen has an analysis file (even if minimal due to errors)
- [ ] All analysis files follow the comprehensive template structure
- [ ] Summary report lists all screens and their status
- [ ] Any failed screens are clearly documented with error reasons
- [ ] Action items are provided for completing any missing analyses

## Example Usage

```
User: "Analyze all prepared screens"

Expected process:
1. Read <project-home>/.results/screens/screens.yaml
2. **CREATE TODO LIST** with individual items for each screen:
   - [x] Read screens.yaml configuration
   - [ ] Analyze home-dashboard screen
   - [ ] Analyze user-profile screen
   - [ ] Analyze settings-page screen
   - [ ] Analyze checkout-flow screen
   - [ ] Provide final summary report
3. Process each screen todo in order (mark in-progress → complete):
   - Mark "Analyze home-dashboard screen" in-progress → load image → read notes → update analysis → mark completed
   - Mark "Analyze user-profile screen" in-progress → load image → read notes → update analysis → mark completed
   - Mark "Analyze settings-page screen" in-progress → load image → read notes → update analysis → mark completed
   - Mark "Analyze checkout-flow screen" in-progress → load image → read notes → update analysis → mark completed
4. Mark "Provide final summary report" in-progress → generate complete inventory → mark completed

Expected output:
- Updated <project-home>/.results/screens/{screen-1}.analysis.md (with full analysis)
- Updated <project-home>/.results/screens/{screen-2}.analysis.md (with full analysis)
- Updated <project-home>/.results/screens/{screen-3}.analysis.md (with full analysis)
- Updated <project-home>/.results/screens/{screen-4}.analysis.md (with full analysis)
- ... (ALL analysis files updated with comprehensive documentation)
```

## Tools Used

- `read_file`: Read screens.yaml configuration and existing analysis stub files and notes files
- `mcp_figma-download_get-figma-image-download`: Load images directly into agent memory
- `replace_string_in_file`: Update analysis files with image URLs and complete analysis