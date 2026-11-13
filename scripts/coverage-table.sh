#!/usr/bin/env bash
# Prints Vitest's json-summary as a Markdown table, for the PR comment and the
# run's summary: `bash scripts/coverage-table.sh <summary.json> <title>`.
set -euo pipefail
summary="$1"
title="$2"
echo "### ${title}"
echo ""
echo "Line and branch coverage, no floor. Every gap gets a test or a written reason (\`vitest.config.ts\`, \`vitest.db.config.ts\`)."
echo ""
echo "| File | Lines | Branches |"
echo "|---|---:|---:|"
jq -r --arg root "$(pwd)/" '
  to_entries
  | sort_by(.key == "total", .key)
  | .[]
  | "| \(if .key == "total" then "**total**" else (.key | ltrimstr($root) | ltrimstr("/repo/")) end) | \(.value.lines.pct)% | \(.value.branches.pct)% |"
' "$summary"
