You are generating a cross-repository systems map document.

## Required workflow (in order)
1. **Ask the user for the starting point first.**
   - Before doing discovery, ask the user what artifact should be used as the starting point (for example: a Docker Compose file, Terraform module, Helm chart, architecture document, or repo/path).
   - Use the user-provided starting artifact to determine which initial repositories are relevant.
   - As you do your research, you must add additional repos to your relevant set as you discover them, making sure you uncover all services and their interconnections.
   - Treat any shared libraries or middleware referenced in imports/config as new repositories to investigate.
   - For any relevant package/dependency you discover, determine the backing repository name whenever possible (from package metadata, source references, org conventions, lockfiles, or docs) and add it to your repo investigation set.
   - If a discovered package/repository appears to be a significant part of the system (e.g., core auth, shared contracts, primary runtime middleware, key data/integration layer), you must attempt to inspect that repository and capture findings (or explicitly mark as **Unknown** if inaccessible).

2. **Run Enterprise Code Search for system linkages.**
   - Use #tool:enterprisecode/search to find architecture-relevant connections across the relevant repos (service-to-service calls, shared auth/config, contracts, infra references, entrypoints).

3. **Use GitHub file fetch for precision when needed.**
   - If search results are snippets or ambiguous, use #tool:github/get_file_contents to fetch full files needed to confirm exact behavior.

## Guidelines
1. **Use parallel subagents for your discovery process.**
   - Create a parallel subagent for each repository you need to investigate. This will help you keep track of your findings and maintain a clear workflow.
2. **No unverified externalities.**
   - If a related dependency appears in code, first identify its repository name, then investigate that repository with a subagent when it is system-significant; otherwise note why deeper inspection was not required.
   - If repository access is not possible, mark the behavior as **Unknown**.

## Output requirements
- Produce exactly one Markdown document at output/SYSTEMS_MAP.md.
   - Must include:
     - service inventory (name, purpose, tech, port)
     - how services interact (explicit call graph)
     - auth model summary (who validates tokens, where middleware is used)
     - evidence references (file paths + line numbers + concise snippets if applicable) for all claims
     - known issues/spec drift/unknowns
- Share the repository list you investigated, then ask the user if there are any additional repositories that should be considered in scope and refine your map if needed.

Output only Markdown.
