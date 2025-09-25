You are an agile product owner. I will provide one story (from `./results/analysis/stories.md`), its associated images, and related analysis files that contain detailed documentation of UI elements and functionality. 
Write out the full story in Bitovi's Story Writing format defined here https://bitovi.atlassian.net/wiki/spaces/agiletraining/pages/401113200/Story+Writing. You MUST read those guidelines.

Include these sections:
1. User Story (As a … I want … so that …)
2. Supporting Artifacts (list the provided image links/names, analysis files, plus any other useful references)
3. Out of Scope 
4. Non-Functional Requirements (performance, accessibility, security, etc.)
5. Developer Notes (technical dependencies or considerations)
6. Acceptance Criteria (nested Gherkin format). Make sure to embed images related to the acceptance criteria in the acceptance criteria. Bold Gherkin words like **GIVEN**, **WHEN**, **THEN**.

**CRITICAL: Base acceptance criteria ONLY on what is actually visible in the provided images and documented in the analysis files. The analysis files contain comprehensive documentation of every UI element, control, and behavior visible in each screen. Use these files to ensure complete and accurate acceptance criteria. Do not add features, UI elements, or functionality that are not explicitly shown in the designs or documented in the analysis.**

**AVOID IMPLIED STYLING CRITERIA: Do not include acceptance criteria for basic visual styling like  "consistent spacing", "professional styling", "readable fonts", or "proper contrast" unless there's something very unusual. These are implied since developers will match the provided designs.**

Ensure the output matches the format shown here:
https://bitovi.atlassian.net/wiki/spaces/BITAPP/pages/472580235. 

You MUST read those guidelines.

## Nested Gherkin Format

The nested gherkin format follows this specific structure as shown in `./nested-gherkin.md`:

```markdown
**GIVEN** [initial state or context]:

![Description of initial state](../screens/image-name.png)

- **WHEN** [user action], **THEN**
  - [expected result 1]
  - [expected result 2]
  - [expected result 3]
    
    ![Description of intermediate state](../screens/image-name-2.png)

  - **WHEN** [subsequent action or condition], **THEN**
    - [expected result from subsequent action]
    - [another expected result]

      ![Description of final state](../screens/image-name-3.png)

  - **WHEN** [alternative condition], **THEN** [alternative result]:

    ![Description of alternative state](../screens/image-name-4.png)
```

**Key formatting rules:**
- Use **bold** for all Gherkin keywords: **GIVEN**, **WHEN**, **THEN**
- Use bullet points with proper indentation to show nesting hierarchy
- Embed relevant images directly within the acceptance criteria where they illustrate the state being described
- Include image descriptions that clearly explain what the image shows
- Use relative paths `../screens/` for images and `../analysis/` for analysis files

## Image Cropping

When full screenshots contain multiple UI elements but you need to focus on specific functionality for acceptance criteria, use the crop-image prompt from `./crop-image/crop-image.md` to create focused images:

1. **Identify when cropping is needed**: If a full screenshot shows multiple unrelated UI sections but your acceptance criteria focuses on one specific area (e.g., a modal, form section, navigation component, etc.)

2. **Use the crop-image prompt**: Follow the format:
   ```
   Please crop the `../screens/original-image.png` file to show just the [specific UI element/section]. Create the cropped image at `../screens/cropped-[element-name].png`.
   ```

3. **Reference cropped images**: Use the cropped images in your acceptance criteria instead of full screenshots when they better illustrate the specific functionality being tested.

**Example scenarios for cropping:**
- Isolating a modal dialog from the full page
- Focusing on form validation messages
- Highlighting specific navigation elements
- Showing just a data table or grid component
- Isolating error states or loading indicators

An rendered example of the nested gherkin format with embedded images can be found in `./nested-gherkin.png`. You must look at that image. 

**IMPORTANT FILE PATH REQUIREMENTS:**
- Images are located in `.results/screens/` directory
- Analysis files are located in `.results/analysis/` directory  
- The story files are written to `.results/stories/` directory
- Use relative path `../screens/` to reference images from story files
- Use relative path `../analysis/` to reference analysis files from story files
- Image filenames now use hyphens instead of spaces (e.g., `Applicants---new.png`)
- Analysis filenames match image names but with `.md` extension (e.g., `Applicants---new.md`)
- Example image reference: `![Image Name](../screens/Applicants---new.png)`
- Example analysis reference: `[Analysis File](../analysis/Applicants---new.md)`

Write out the ticket in `.results/stories/{story-title}.md`. Replace the story title with hyphens when naming the markdown file. 

