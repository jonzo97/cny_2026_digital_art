#!/usr/bin/env bash
# test-gate.sh — Stop hook that gates on test passage
# Auto-detects test runner and runs tests before allowing stop.
# Exit 0 = allow stop (tests pass), output JSON block = force continue (tests fail)

set -euo pipefail

# Allow bypass via environment variable
if [[ "${GATE_SKIP_TESTS:-}" == "true" ]]; then
  exit 0
fi

# Function to detect test command
detect_test_command() {
  # Check for override
  if [[ -n "${GATE_TEST_CMD:-}" ]]; then
    echo "$GATE_TEST_CMD"
    return
  fi

  # 1. npm test
  if [[ -f "package.json" ]] && grep -q '"test"' package.json 2>/dev/null; then
    echo "npm test"
    return
  fi

  # 2. pytest
  if [[ -f "pytest.ini" ]] || (
    [[ -f "pyproject.toml" ]] && grep -q '\[tool\.pytest' pyproject.toml 2>/dev/null
  ); then
    echo "pytest"
    return
  fi

  # 3. cargo test
  if [[ -f "Cargo.toml" ]]; then
    echo "cargo test"
    return
  fi

  # 4. go test
  if [[ -f "go.mod" ]]; then
    echo "go test ./..."
    return
  fi

  # 5. make test
  if [[ -f "Makefile" ]] && grep -q '^test:' Makefile 2>/dev/null; then
    echo "make test"
    return
  fi

  # No test runner found
  echo ""
}

# Detect test command
TEST_CMD=$(detect_test_command)

if [[ -z "$TEST_CMD" ]]; then
  echo "Warning: No test runner detected. Allowing stop." >&2
  exit 0
fi

# Run tests
echo "Running tests: $TEST_CMD" >&2
if $TEST_CMD; then
  echo "Tests passed." >&2
  exit 0
else
  # Tests failed - output JSON to block stop
  cat <<EOF
{"decision":"block","reason":"Tests failing. Fix the failing tests before stopping."}
EOF
  exit 1
fi
