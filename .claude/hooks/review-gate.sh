#!/usr/bin/env bash
# review-gate.sh — Stop hook that spawns a reviewer agent after builder completion
# Only activates after builder signals task completion.
# Runs `claude` CLI to spawn a review, gates on PASS result.

set -euo pipefail

# Allow bypass via environment variable
if [[ "${GATE_SKIP_REVIEW:-}" == "true" ]]; then
  exit 0
fi

# Configuration
REVIEWER_AGENT="${GATE_REVIEW_AGENT:-reviewer}"
REVIEW_TIMEOUT="${GATE_REVIEW_TIMEOUT:-120}"

# Read stdin to detect builder completion signals
STDIN_CONTENT=""
if [[ ! -t 0 ]]; then
  STDIN_CONTENT=$(cat)
fi

# Check for completion signals
COMPLETION_SIGNALS=(
  "task complete"
  "implementation done"
  "RALPH_COMPLETE"
  "builder complete"
  "work complete"
)

SIGNAL_DETECTED=false
for signal in "${COMPLETION_SIGNALS[@]}"; do
  if echo "$STDIN_CONTENT" | grep -qi "$signal"; then
    SIGNAL_DETECTED=true
    break
  fi
done

# If no completion signal, not a builder stop - allow it
if [[ "$SIGNAL_DETECTED" == "false" ]]; then
  exit 0
fi

# Check if claude CLI is available
if ! command -v claude &>/dev/null; then
  echo "Warning: claude CLI not found. Skipping review gate." >&2
  exit 0
fi

# Spawn reviewer agent
echo "Builder completion detected. Spawning reviewer agent..." >&2

REVIEW_PROMPT="Review the latest changes. Run tests. Check git diff. Output REVIEW_PASS or REVIEW_FAIL with details."

# Run reviewer with timeout
REVIEW_OUTPUT=""
if REVIEW_OUTPUT=$(timeout "$REVIEW_TIMEOUT" claude --agent "$REVIEWER_AGENT" --print "$REVIEW_PROMPT" 2>&1); then
  REVIEW_EXIT_CODE=0
else
  REVIEW_EXIT_CODE=$?
fi

# Check for timeout
if [[ $REVIEW_EXIT_CODE -eq 124 ]]; then
  cat <<EOF
{"decision":"block","reason":"Reviewer timeout after ${REVIEW_TIMEOUT}s. Manual review needed."}
EOF
  exit 1
fi

# Parse review result
if echo "$REVIEW_OUTPUT" | grep -q "REVIEW_PASS"; then
  echo "Review passed." >&2
  exit 0
elif echo "$REVIEW_OUTPUT" | grep -q "REVIEW_FAIL"; then
  # Extract failure details if available
  FAIL_DETAILS=$(echo "$REVIEW_OUTPUT" | grep -A 10 "REVIEW_FAIL" | head -15)

  # Escape for JSON
  FAIL_DETAILS_JSON=$(echo "$FAIL_DETAILS" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '"Review failed - see details above"')

  cat <<EOF
{"decision":"block","reason":"Review failed. Details: ${FAIL_DETAILS_JSON}"}
EOF
  exit 1
else
  # Ambiguous result - require manual check
  cat <<EOF
{"decision":"block","reason":"Review result unclear. Manual verification needed."}
EOF
  exit 1
fi
