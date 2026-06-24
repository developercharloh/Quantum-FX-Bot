#!/usr/bin/env bash
set -euo pipefail

echo "=== Quantum FX Bot — Deploy to GitHub + Render ==="

# Require token env vars
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN secret is not set." >&2
  exit 1
fi
if [ -z "${GITHUB_REPO_URL:-}" ]; then
  echo "ERROR: GITHUB_REPO_URL secret is not set." >&2
  exit 1
fi

# Build authenticated push URL
REPO_PATH=$(echo "$GITHUB_REPO_URL" | sed 's|https://github.com/||' | sed 's|\.git$||')
PUSH_URL="https://${GITHUB_TOKEN}@github.com/${REPO_PATH}.git"

echo "→ Pushing to GitHub: github.com/${REPO_PATH}"

# Stage and commit any pending local changes before pushing
git add -A
if ! git diff --cached --quiet; then
  git -c user.email="deploy@quantumfx.com" -c user.name="Deploy Bot" \
    commit -m "chore: deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

git push --force "$PUSH_URL" HEAD:main
echo "✓ Pushed to GitHub"

# Trigger Render deploys directly via API (autoDeploy covers it, but this is instant)
if [ -n "${RENDER_API_TOKEN:-}" ]; then
  echo "→ Triggering Render deploys via API..."
  for SERVICE_ID in srv-d8tk21gjs32c73bqv00g srv-d8tegnhkh4rs73bvb4m0; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${RENDER_API_TOKEN}" \
      -H "Content-Type: application/json" \
      "https://api.render.com/v1/services/${SERVICE_ID}/deploys")
    if [ "$RESPONSE" = "201" ]; then
      echo "  ✓ Deploy triggered for ${SERVICE_ID}"
    else
      echo "  ⚠ Deploy trigger returned HTTP ${RESPONSE} for ${SERVICE_ID}"
    fi
  done
fi

echo ""
echo "✓ Done! Render is now deploying:"
echo "  • https://quantum-fx-bot.onrender.com"
echo "  • https://admin-app-ogdq.onrender.com"
