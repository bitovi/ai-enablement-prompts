#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# run-tier-test.sh — Runs the figma-from-code batch workflow against the
# 3-component tier-dependency test app.
#
# Usage:
#   bash plugins/figma-from-code/tests/run-tier-test.sh <figma-file-key>
#
# Prerequisites:
#   - Node.js >= 18
#   - npm install already run in plugins/figma-from-code/tests/test-app/
#     (or this script will run it for you)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_APP_DIR="${SCRIPT_DIR}/test-app"
PLUGIN_ROOT="${SCRIPT_DIR}/.."
DEV_SERVER_URL="http://localhost:5173"
DEV_SERVER_PID=""

# ── Args ─────────────────────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <figma-file-key> [--start-phase <phase>] [--end-phase <phase>]"
  echo ""
  echo "Example:"
  echo "  $0 abc123XYZ"
  echo "  $0 abc123XYZ --end-phase 0a   # Discovery only"
  exit 1
fi

FILE_KEY="$1"
shift
EXTRA_ARGS=("$@")

# ── Cleanup trap ─────────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "${DEV_SERVER_PID}" ]]; then
    echo "🛑 Stopping dev server (PID ${DEV_SERVER_PID})..."
    kill "${DEV_SERVER_PID}" 2>/dev/null || true
    wait "${DEV_SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── Install dependencies ─────────────────────────────────────────────────────
if [[ ! -d "${TEST_APP_DIR}/node_modules" ]]; then
  echo "📦 Installing test-app dependencies..."
  (cd "${TEST_APP_DIR}" && npm install)
fi

# ── Start dev server ─────────────────────────────────────────────────────────
echo "🚀 Starting Vite dev server..."
(cd "${TEST_APP_DIR}" && npm run dev -- --host 0.0.0.0 --port 5173) &
DEV_SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for dev server at ${DEV_SERVER_URL}..."
RETRIES=30
until curl -sf "${DEV_SERVER_URL}" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [[ ${RETRIES} -le 0 ]]; then
    echo "❌ Dev server failed to start within 30 seconds"
    exit 1
  fi
  sleep 1
done
echo "✅ Dev server is ready"

# ── Run workflow ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Running figma-from-code batch workflow"
echo " File key:    ${FILE_KEY}"
echo " Source dir:  ${TEST_APP_DIR}/src"
echo " Components:  src/components"
echo " Dev server:  ${DEV_SERVER_URL}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# The batch workflow is invoked via the Claude workflow runner.
# This prints the configuration for manual or automated invocation.
cat <<EOF

──────────────────────────────────────────────────────────────────────
WORKFLOW INVOCATION CONFIG
──────────────────────────────────────────────────────────────────────
Workflow:         ${PLUGIN_ROOT}/workflows/figma-from-code.js
File key:         ${FILE_KEY}
Dev server URL:   ${DEV_SERVER_URL}
Source directory:  ${TEST_APP_DIR}/src
Components root:  ["src/components"]
Pages root:       src
CSS path:         src/index.css
Tailwind config:  tailwind.config.js
Icon library:     lucide-react

Extra args: ${EXTRA_ARGS[*]:-"(none)"}

To invoke manually with Claude Code:
  claude --workflow ${PLUGIN_ROOT}/workflows/figma-from-code.js \\
    --input '{
      "fileKey": "${FILE_KEY}",
      "devServerUrl": "${DEV_SERVER_URL}",
      "devServerStart": "npm run dev",
      "sourceDir": "${TEST_APP_DIR}/src",
      "componentsRoot": ["src/components"],
      "pagesRoot": "src",
      "cssPath": "src/index.css",
      "tailwindConfigPath": "tailwind.config.js",
      "iconLibrary": "lucide-react"
    }'
──────────────────────────────────────────────────────────────────────

EOF

echo "🎯 Dev server running. Ready for workflow execution."
echo "   Press Ctrl+C to stop the dev server and exit."

# Keep the script alive so the dev server stays running
wait "${DEV_SERVER_PID}"
