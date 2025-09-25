# Writing Stories from Figma

This collection of prompts automates the process of converting Figma design files into detailed user stories and acceptance criteria for development teams.

## What These Prompts Do

The prompts work together as a 4-step pipeline to transform Figma designs into development-ready user stories:

1. **Prepare Analysis** (`0-prepare-analysis.md`) - Downloads screens and notes from Figma, creates organized file structure
2. **Analyze Screens** (`1-analyze-screens.md`) - Performs detailed UX analysis of each screen, documenting UI elements and behaviors
3. **Create Shell Stories** (`2-shell-stories.md`) - Breaks down functionality into incremental, prioritized user stories
4. **Write Full Stories** (`3-write-story.md`) - Converts shell stories into complete tickets with acceptance criteria in Gherkin format

The output includes comprehensive documentation with embedded images, detailed analysis files, and development-ready user stories that follow Bitovi's story writing standards.

## Prerequisites

To use these prompts, you need:

- **VS Code with GitHub Copilot** - The prompts are designed for VS Code's AI agent interface
- **Figma Access** - View permissions to the Figma design files you want to process
- **Figma Page URL** - A URL to a specific Figma page where all frames on that page will be downloaded and analyzed
- **MCP Figma Extension** - The prompts use Figma download tools to access designs and notes

## How to Use

Run the prompts sequentially in order:

### Step 1: Prepare Analysis
Use the `0-prepare-analysis.md` prompt with your Figma page URL (all frames on this page will be downloaded):
```
Prepare analysis for https://www.figma.com/design/[your-figma-file-id]/[file-name]?node-id=[page-node-id]
```

This creates:
- `<project-home>/.results/screens/screens.yaml` - Logical flow order of screens  
- `<project-home>/.results/screens/{screen}.analysis.md` - Stub analysis files
- `<project-home>/.results/screens/{screen}.notes.md` - Design notes associated with each screen

### Step 2: Analyze Screens
Use the `1-analyze-screens.md` prompt to perform detailed analysis:
```
Analyze all prepared screens
```

This updates all analysis files with:
- Comprehensive UI element documentation
- Interactive behavior descriptions  
- Technical considerations
- Integration of design notes

### Step 3: Create Shell Stories
Use the `2-shell-stories.md` prompt to break down functionality:
```
Create shell stories from the screen analyses
```

This generates:
- `<project-home>/.results/stories/shell-stories.md` - Prioritized list of incremental user stories
- Dependencies between stories
- Scope definitions and open questions

### Step 4: Write Full Stories
Use the `3-write-story.md` prompt for each shell story:
```
Write full story for st001 [story title]
```

This creates individual story files with:
- Complete user story format
- Nested Gherkin acceptance criteria
- Embedded screenshots and analysis references
- Technical notes and requirements

## Output Structure

The complete process creates this file structure:
```
.results/
├── screens/
│   ├── screens.yaml
│   ├── {screen-name}.analysis.md
│   └── {screen-name}.notes.md
└── stories/
    ├── shell-stories.md
    └── {story-title}.md
```

Each output file is self-contained and references supporting materials, making them ready for development team handoff.

## What If My Figma Isn't Organized?

If your Figma designs aren't all on a single page or aren't organized in a logical flow, you can manually create the required files:

### Manual Setup Process

1. **Create the directory structure:**
   ```
   mkdir -p <project-home>/.results/screens
   ```

2. **Build `screens.yaml` manually:**
   Create `<project-home>/.results/screens/screens.yaml` with URLs to individual screens:
   ```yaml
   # You can ignore the order property when building manually
   order: "manual"
   screens:
     - login-screen
     - dashboard-main
     - user-profile
     - settings-page
   ```

3. **Create individual analysis stub files:**
   For each screen listed in `screens.yaml`, create `<project-home>/.results/screens/{screen-name}.analysis.md`:
   ```markdown
   # Screen: Login Screen
   
   - Figma Node Url: `https://www.figma.com/design/[file-id]/[name]?node-id=[specific-frame-id]`
   ```

4. **Create note files (optional):**
   If you have design notes or annotations, create `<project-home>/.results/screens/{screen-name}.notes.md` files:
   ```markdown
   ## Note 1
   
   [Your design notes and requirements here]
   ```

5. **Continue with Step 2:**
   Once your manual setup is complete, proceed with the "Analyze Screens" step as normal.

### Tips for Manual Setup
- Use descriptive, kebab-case names for screens (e.g., `user-login-form`, `dashboard-overview`)
- Ensure each Figma Node URL points to a specific frame, not the entire file
- Group related screens logically in your `screens.yaml` file even if the `order` is manual
- Note files are optional but helpful for capturing design decisions and requirements


