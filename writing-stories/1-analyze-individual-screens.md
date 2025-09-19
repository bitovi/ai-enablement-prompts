# Screen Analysis Prompt

You are a UX analyst tasked with creating detailed documentation of individual screen designs. I will provide you with screen images from a design tool.

Your task is to:
1. Analyze each screen image individually in `.results/screens/`
2. Read any associated notes file (`{screen-name}.notes.md`) for additional context
3. Document every visible UI element, control, and implied behavior
4. Integrate design notes and annotations into the analysis
5. Create comprehensive analysis files in `.results/analysis/`

For each screen image, first check for an associated notes file (`{screen-name}.notes.md`) in `.results/screens/`, then create a detailed analysis file named `{screen-name}.md` in `.results/analysis/` with the following structure:

## Screen: {Screen Name}
**File:** `{filename}.png`
**Notes:** `{filename}.notes.md` (if exists)

### Design Notes & Annotations
If a notes file exists, summarize key design decisions and requirements:
- **Behavioral Requirements:** Specific functionality described in notes
- **Performance Considerations:** Loading, pagination, or performance notes
- **Business Rules:** Validation rules, user permissions, data requirements
- **Implementation Notes:** Technical considerations or constraints
- **UX Guidelines:** Specific user experience requirements

### Page Structure
- **Header/Navigation:** Describe top-level navigation, branding, search, user controls
- **Page Title:** Main heading and any subtitle/description
- **Layout:** Overall page structure (sidebar, main content, etc.)

### Primary UI Elements
Document every visible element:
- **Buttons:** List all buttons with their labels and visual states (primary, secondary, disabled)
- **Tabs/Filters:** Status filters, navigation tabs, toggle controls
- **Form Controls:** Inputs, dropdowns, checkboxes, radio buttons
- **Navigation:** Pagination, breadcrumbs, back/forward controls
- **Actions:** Click targets, hover states, interactive elements

### Data Display
- **Table Structure:** Column headers, data types, sortable indicators
- **Data Fields:** All visible data columns and their content types
- **Visual Indicators:** Status badges, icons, color coding
- **Empty States:** How missing/null data is displayed

### Interactive Behaviors (Implied)
Based on visual cues and any notes provided, document likely behaviors:
- **Clickable Elements:** What appears to be clickable and where it might lead
- **Sorting:** Which columns appear sortable (arrows, styling)
- **Filtering:** How filters appear to work
- **State Changes:** Selected vs unselected states
- **Progressive Disclosure:** Expandable sections, hover details
- **Note-Specified Behaviors:** Any specific interactions described in design notes

### Content & Data
- **Sample Data:** What type of information is displayed
- **Data Patterns:** Formats for dates, names, statuses, etc.
- **Content Hierarchy:** Visual emphasis and organization

### Unique Features
- **Screen-Specific Elements:** Features that don't appear in other screens
- **Advanced Functionality:** Complex controls or specialized widgets
- **Differences:** How this screen differs from related screens

### Technical Considerations
- **Responsive Indicators:** Mobile/tablet considerations visible
- **Performance Implications:** Large data sets, complex interactions
- **Accessibility:** Visible accessibility features

## Instructions:
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

**CRITICAL:** 
1. **Always check for notes:** Look for `{screen-name}.notes.md` in the same directory as the screen image
2. **Integrate thoughtfully:** Use notes to enhance your visual analysis, not replace it
3. **Cite sources:** Distinguish between what you observe visually vs. what notes specify
4. **Base analysis primarily on visuals:** Notes supplement but don't override visual evidence
5. If an element's behavior is unclear from visuals, check if notes provide clarification

Create one analysis file per screen image, incorporating any available notes.
