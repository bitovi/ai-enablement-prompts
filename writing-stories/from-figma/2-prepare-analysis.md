# Prepare Analysis

This prompt creates stub analysis files for each screen listed in the screens.yaml file, setting up the structure for detailed screen analysis.

## Instructions

You are tasked with creating stub analysis files for all screens listed in the screens.yaml configuration. Follow these steps:

### 1. Read Screen Configuration

First, read the `/.results/screens/screens.yaml` file to get the list of screens to create analysis files for.

The YAML structure contains:
```yaml
order: "left-to-right, top-to-bottom"
screens:
  - name: "home-dashboard"
    url: "https://www.figma.com/design/..."
    notes:
      - "https://www.figma.com/design/..."
  - name: "user-profile"
    url: "https://www.figma.com/design/..."
    notes: []
```

### 2. Create Analysis Stub Files

For each screen in the `screens` array:

#### Step A: Use Screen Name from YAML

Use the screen name directly from the YAML file (already in file-safe format):
- The `name` field in screens.yaml is already converted to file-safe format
- Use this name directly for file naming
- Examples from YAML:
  - `name: "home-dashboard"` → file: `home-dashboard.analysis.md`
  - `name: "user-profile-settings"` → file: `user-profile-settings.analysis.md`
  - `name: "application-form-step-1"` → file: `application-form-step-1.analysis.md`

#### Step B: Create Stub Analysis File

Create a stub analysis file at `<project-home>/.results/screens/{screen-name}.analysis.md` (using name directly from YAML):

**File content template:**
```markdown
# Screen: {screen-name}

- **Figma Node URL:** `{screen.url}`
- **Screen Order:** {position in screens array} of {total screens}
- **Has Notes:** {Yes/No based on whether notes array is empty}

## Analysis Status

🔄 **PENDING ANALYSIS** - This file is ready for detailed screen analysis.

Use the `3-analyze-screens.md` prompt to populate this file with comprehensive UI documentation.

## Quick Reference

- **Screen Name:** {screen-name}
- **File Name:** {screen-name}
- **Notes File:** {screen-name}.notes.md {(exists/not applicable)}
- **Position in Flow:** Screen {position} in {order} flow

---

*This is a stub file. Run screen analysis to populate with detailed UI documentation.*
```

**Template variables:**
- `{screen-name}`: Use the exact `name` field from the YAML (already file-safe)
- `{screen.url}`: Use the exact `url` field from the YAML  
- `{position in screens array}`: Sequential number (1, 2, 3, etc.)
- `{total screens}`: Total count of screens in the array
- `{Yes/No based on whether notes array is empty}`: "Yes" if notes array has items, "No" if empty
- `{order}`: Use the `order` field from the YAML
- `{(exists/not applicable)}`: Check if corresponding notes file would exist

### 3. File Validation

For each screen, verify:
- Screen has a valid `name` field
- Screen has a valid `url` field  
- Screen has a `notes` field (even if empty array)
- Generated file name is unique (no duplicates)

### 4. Error Handling

**MANDATORY CONTINUATION**: If any individual screen fails, document the error and continue processing the remaining screens.

- **Missing screen data**: Create a basic stub with error message and **CONTINUE** with next screen
- **Invalid URLs**: Log the error but still create the stub file with the provided URL and **CONTINUE**
- **Invalid screen names**: Use a fallback naming scheme (screen-1, screen-2, etc.) and **CONTINUE**
- **Duplicate file names**: Add numeric suffixes (-1, -2, etc.) to ensure uniqueness and **CONTINUE**
- **Missing screens.yaml**: Stop processing and inform user that screens must be prepared first

**NEVER** stop processing due to individual screen failures. The goal is to create stub files for as many screens as possible.

### 5. File Management

**Stub analysis files created:**
- Location: `<project-home>/.results/screens/{screen-name}.analysis.md` (using name from YAML)
- One file per screen in the screens.yaml file
- **REQUIREMENT**: Every screen in screens.yaml must have a corresponding analysis stub file

**No new directories needed** - all work is done with existing file structure from the screen preparation step.

### 6. Summary Report (MANDATORY)

**REQUIRED**: After creating ALL stub files, provide a detailed summary including:
- **COMPLETE INVENTORY**: List every screen from screens.yaml and its stub file creation status
- Total number of stub files created successfully
- **FAILURE REPORT**: List of any screens that couldn't have stub files created with specific error reasons
- Screen flow order being used
- List of all created analysis stub files
- **NEXT STEPS**: Instructions for running the screen analysis prompt
- **ACTION ITEMS**: Specific steps needed to complete any failed stub creations

## Critical Requirements

1. **CREATE ALL STUBS**: Process every screen listed in screens.yaml - no exceptions
2. **Direct naming**: Use screen names directly from YAML (already file-safe)
3. **Proper structure**: Each stub must follow the exact template format
4. **Resilient execution**: Continue processing even if individual screens fail
5. **File validation**: Ensure no duplicate file names or missing required data
6. **Complete documentation**: Each stub should contain all metadata about its screen
7. **Mandatory reporting**: Provide complete inventory of success/failure for every screen

## Verification Checklist

Before completing the task, verify:
- [ ] Every screen in screens.yaml has a corresponding analysis stub file
- [ ] All stub files follow the proper template format
- [ ] No duplicate file names exist
- [ ] All file names match the names from screens.yaml exactly
- [ ] A brief summary report lists all files created and any failures
- [ ] Next steps are clearly documented

## Example Usage

```
User: "Prepare analysis stubs from screens.yaml"

Expected process:
1. Read <project-home>/.results/screens/screens.yaml
2. For each screen in the array:
   - Convert name to file-safe format
   - Create stub analysis file with proper template
   - Validate file creation success
3. Provide summary report

Expected output:
- <project-home>/.results/screens/home-dashboard.analysis.md (stub)
- <project-home>/.results/screens/user-profile.analysis.md (stub)
- <project-home>/.results/screens/settings-page.analysis.md (stub)
- ... (one stub file per screen)
- Summary report of all stub file creation results
```

## Tools Used

- `read_file`: Read screens.yaml configuration
- `create_file`: Create stub analysis files