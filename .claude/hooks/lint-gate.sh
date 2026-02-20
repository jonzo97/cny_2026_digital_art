#!/usr/bin/env bash
# lint-gate.sh — Stop hook that gates on clean linter output
# Auto-detects linter and runs before allowing stop.
# Exit 0 = allow stop (lint passes), output JSON block = force continue (lint fails)

set -euo pipefail

# Allow bypass via environment variable
if [[ "${GATE_SKIP_LINT:-}" == "true" ]]; then
  exit 0
fi

# Function to detect lint command
detect_lint_command() {
  # Check for override
  if [[ -n "${GATE_LINT_CMD:-}" ]]; then
    echo "$GATE_LINT_CMD"
    return
  fi

  # 1. eslint
  if [[ -f ".eslintrc.js" ]] || [[ -f ".eslintrc.json" ]] || [[ -f "eslint.config.js" ]]; then
    echo "npx eslint ."
    return
  fi

  # 2. ruff
  if [[ -f "ruff.toml" ]] || (
    [[ -f "pyproject.toml" ]] && grep -q '\[tool\.ruff' pyproject.toml 2>/dev/null
  ); then
    echo "ruff check ."
    return
  fi

  # 3. cargo clippy
  if [[ -f "Cargo.toml" ]]; then
    echo "cargo clippy"
    return
  fi

  # 4. golangci-lint
  if [[ -f ".golangci.yml" ]]; then
    echo "golangci-lint run"
    return
  fi

  # No linter found
  echo ""
}

# Detect lint command
LINT_CMD=$(detect_lint_command)

if [[ -z "$LINT_CMD" ]]; then
  echo "Warning: No linter detected. Allowing stop." >&2
  exit 0
fi

# Run linter
echo "Running linter: $LINT_CMD" >&2
if $LINT_CMD; then
  echo "Linter passed." >&2
  exit 0
else
  # Linter failed - output JSON to block stop
  cat <<EOF
{"decision":"block","reason":"Linter errors found. Fix linting issues before stopping."}
EOF
  exit 1
fi
