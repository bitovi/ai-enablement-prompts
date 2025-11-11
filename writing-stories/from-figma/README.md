# Writing Stories from Figma

This collection of prompts automates the process of converting Figma design files into detailed user stories and acceptance criteria for development teams.

👉 Bitovi can help you integrate this into your own SDLC workflow: [AI for Software Teams](https://www.bitovi.com/ai-for-software-teams)


## What These Prompts Do

The prompts work together as a 6-step pipeline to transform Figma designs into development-ready user stories:

1. **Prepare Screens** (`0-prepare-screens.md`) - Downloads screens and notes from Figma, creates organized file structure
2. **Prepare Notes** (`1-prepare-notes.md`) - Downloads and extracts text from design note annotations
3. **Prepare Analysis** (`2-prepare-analysis.md`) - Creates stub analysis files for each screen
4. **Analyze Screens** (`3-analyze-screens-alt.md`) - Performs detailed UX analysis of each screen, documenting UI elements and behaviors
5. **Create Shell Stories** (`4-shell-stories.md`) - Breaks down functionality into incremental, prioritized user stories
6. **Write Full Stories** (`5-write-story.md`) - Converts shell stories into complete tickets with acceptance criteria in Gherkin format

The output includes comprehensive documentation with embedded images, detailed analysis files, and development-ready user stories that follow Bitovi's story writing standards.

## Prerequisites

To use these prompts, you need:

- **VS Code with GitHub Copilot** - The prompts are designed for VS Code's AI agent interface
- **Figma Access** - View permissions to the Figma design files you want to process
- **Figma Page URL** - A URL to a specific Figma page where all frames on that page will be downloaded and analyzed
- **MCP Figma Extension** - The prompts use Figma download tools to access designs and notes

## How to Use

Run the prompts sequentially in order:

### Step 1: Prepare Screens
Use the `0-prepare-screens.md` prompt with your Figma page URL (all frames on this page will be downloaded):
```
Prepare screens for https://www.figma.com/design/[your-figma-file-id]/[file-name]?node-id=[page-node-id]
```

This creates:
- `<project-home>/.results/screens/screens.yaml` - Logical flow order of screens with associated notes

### Step 2: Prepare Notes
Use the `1-prepare-notes.md` prompt to extract text from design annotations:
```
Prepare notes from screens.yaml
```

This creates:
- `<project-home>/.results/screens/{screen}.notes.md` - Text content from design note annotations

### Step 3: Prepare Analysis
Use the `2-prepare-analysis.md` prompt to create stub analysis files:
```
Prepare analysis stubs from screens.yaml
```

This creates:
- `<project-home>/.results/screens/{screen}.analysis.md` - Stub analysis files ready for detailed documentation

### Step 4: Analyze Screens
Use the `3-analyze-screens-alt.md` prompt to perform detailed analysis:
```
Follow the instructions in 3-analyze-screens-alt.md
```

This updates all analysis files with:
- Comprehensive UI element documentation
- Interactive behavior descriptions  
- Technical considerations
- Integration of design notes

### Step 5: Create Shell Stories
Use the `4-shell-stories.md` prompt to break down functionality:
```
Create shell stories from the screen analyses
```

This generates:
- `<project-home>/.results/stories/shell-stories.md` - Prioritized list of incremental user stories
- Dependencies between stories
- Scope definitions and open questions

### Step 6: Write Full Stories
Use the `5-write-story.md` prompt for each shell story:
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

If your Figma designs aren't all on a single page or aren't organized in a logical flow, you can manually create the `screens.yaml` file and then use all the other prompts as normal.

### Manual Setup Process

1. **Create the directory structure:**
   ```
   mkdir -p <project-home>/.results/screens
   ```

2. **Build `screens.yaml` manually:**
   Create `<project-home>/.results/screens/screens.yaml` with URLs to individual screens:
   ```yaml
   # Screen flow order determined manually
   order: "manual"
   screens:
     - name: "login-screen"
       url: "https://www.figma.com/design/[file-id]/[name]?node-id=[specific-frame-id]"
       notes:
         - "https://www.figma.com/design/[file-id]/[name]?node-id=[note-frame-id]"
     - name: "dashboard-main"
       url: "https://www.figma.com/design/[file-id]/[name]?node-id=[specific-frame-id]"
       notes: []
     - name: "user-profile"
       url: "https://www.figma.com/design/[file-id]/[name]?node-id=[specific-frame-id]"
       notes:
         - "https://www.figma.com/design/[file-id]/[name]?node-id=[note-frame-id]"
   # Unassociated notes (if any)
   unassociated_notes: []
   ```

3. **Continue with Step 2:**
   Once your `screens.yaml` file is created, proceed with Step 2 (Prepare Notes) and continue through all remaining steps normally.

### Tips for Manual Setup
- Use descriptive, kebab-case names for screens (e.g., `user-login-form`, `dashboard-overview`)
- Ensure each Figma URL points to a specific frame, not the entire file
- Include note URLs in the `notes` array if you have design annotations for each screen
- Group related screens logically in your `screens.yaml` file
- Set `notes: []` for screens without design annotations


