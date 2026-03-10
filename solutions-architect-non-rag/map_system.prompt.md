You are generating a cross-repository systems map document.

## Non-negotiable execution rules
- You MUST perform discovery using docker-compose first.
- You MUST clone repositories locally into `workdir/repos/` and do all investigation from local files.
- You MUST use parallel subagents (one per repo) for analysis.
- You MUST discover and analyze shared auth middleware repos and api-tests if present.
- You MUST validate and correct all routes/payloads/auth claims before writing the final output.

## Output hygiene (VERY IMPORTANT)
- You MUST produce exactly ONE final artifact: `output/SYSTEMS_MAP.md`.
- You MUST NOT create any other output files (no per-repo analysis reports, no middleware reports, no api-tests report).
- Subagents may take notes internally, but all final findings must be consolidated into `output/SYSTEMS_MAP.md` only.

## Required workflow (in order)

### 1) Compose-first discovery (source of truth for services + ports)
- Read: `bitovi-training/service-infra/docker-compose.yml`
- Extract:
  - service names
  - exposed ports
  - environment variables (especially *_SERVICE_URL)
  - depends_on relationships
  - build contexts / images
- Initialize the relevant repo set using build contexts:
  - **Rule:** if `build.context: ../<name>`, assume repo is `bitovi-training/<name>`

### 2) Automated discovery -> cloning -> discovery loop (local-only)
- Create clone workspace:
  - `mkdir -p workdir/repos`
- For each repo in the relevant set:
  - If missing locally, clone into `workdir/repos/`:
    - Prefer SSH: `git clone git@github.com:<owner>/<repo>.git`
    - Fallback HTTPS: `git clone https://github.com/<owner>/<repo>.git`
- Search locally (no MCP search, no GitHub file fetch):
  - Prefer `rg "<pattern>" .` if available, else `grep -R "<pattern>" -n .`
- Discover additional repos from:
  - Go: `go.mod`, import paths, module names
  - Node: `package.json` deps (especially `@bitovi-corp/*`), lockfiles, workspace/monorepo references
  - Docs/CI: references to repo names, “see repo …”, pipeline config
- If new repos are discovered, add them to the relevant repo set and repeat (clone + search).

### 3) Mandatory repo discovery targets (must be found if they exist)
You MUST attempt to locate and analyze these repositories:

- `bitovi-corp/auth-middleware` if any service depends on `@bitovi-corp/auth-middleware`
- `bitovi-corp/auth-middleware-go` if any Go service uses an auth middleware module/package
- `bitovi-training/api-tests` repo (search for it in code/config/docs); if found, clone and analyze

If any of these are referenced but cannot be accessed, state **Unknown** and explain why (e.g., repo not found / permission).

### 4) Subagents (parallel analysis)
Create parallel subagents:
- One subagent per `*-service` repo
- One subagent for `auth-middleware` (if discovered)
- One subagent for `auth-middleware-go` (if discovered)
- One subagent for `api-tests` (if discovered)

Each subagent must:
- confirm repo exists locally under `workdir/repos/<repo>`
- identify: purpose, runtime port, exposed endpoints, auth requirements
- identify: outbound calls to other services (exact method + path + payload + headers)
- capture evidence with file path + line numbers
- report any newly discovered repos to add

### 5) Validation & correction (FAIL-FAST BEFORE OUTPUT)
Before writing `output/SYSTEMS_MAP.md`, you MUST validate the draft against local code and correct mismatches.

Run these checks and do not proceed until they pass:

#### 5A) Route prefix verification (no guessing)
- If the map contains `/api/v1` (or any prefix), you MUST show where the prefix is registered in code.
- If you cannot prove the prefix exists, remove it from the map.

#### 5B) Dockerfile base image verification
- For each service, read its Dockerfile and copy exact `FROM ...` lines (file path + line numbers).

#### 5C) Endpoint verification
- Every endpoint listed must be proven by one of:
  - route registration / controller definition
  - OpenAPI spec
  - tests that call it
- If not proven, mark it **Unknown** or remove it.

#### 5D) Integration payload verification
- For every service-to-service call, verify:
  - env var key used for base URL
  - exact appended path
  - HTTP method
  - JSON payload keys
  - auth header forwarding behavior
- If payload field names differ across services/specs, document the conflict and prefer implementation.

## Output requirements
- Produce exactly one Markdown document at `output/SYSTEMS_MAP.md`.
- Must include:
  - repositories in scope (all repos investigated + why)
  - service inventory (name, purpose, tech, port)
  - how services interact (explicit call graph)
  - auth model summary (who generates tokens, where validation occurs)
  - evidence references (file paths + line numbers)
  - known issues/spec drift/unknowns
- Output only Markdown.