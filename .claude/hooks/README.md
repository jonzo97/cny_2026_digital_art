# Quality Gate Hooks

Stop hooks that enforce quality standards before allowing Claude Code to stop work.

## What Are Quality Gates?

Quality gates are stop hooks that run when Claude Code attempts to stop/pause. They check quality conditions (tests, linting, review) and can:
- **Allow stop** (exit 0) - quality conditions met
- **Block stop** (output JSON) - quality issues found, work must continue

This ensures Claude doesn't stop with broken tests or failing linters.

## Installation

1. **Copy hooks to your Claude Code hooks directory:**
   ```bash
   cp hooks/*.sh ~/.claude/hooks/
   chmod +x ~/.claude/hooks/*.sh
   ```

2. **Configure in `~/.claude/settings.json`:**
   ```json
   {
     "stopHooks": [
       "~/.claude/hooks/test-gate.sh",
       "~/.claude/hooks/lint-gate.sh",
       "~/.claude/hooks/review-gate.sh"
     ]
   }
   ```

3. **Hooks run in order.** First hook to output JSON "block" decision wins.

## Available Hooks

### test-gate.sh — Test Passage Gate

Runs tests before allowing stop. Auto-detects test runner:

**Detection order:**
1. `npm test` (if package.json has "test" script)
2. `pytest` (if pytest.ini or pyproject.toml with [tool.pytest])
3. `cargo test` (if Cargo.toml exists)
4. `go test ./...` (if go.mod exists)
5. `make test` (if Makefile has "test" target)

**Behavior:**
- Tests pass → exit 0 (allow stop)
- Tests fail → output JSON block with reason

**Environment variables:**
- `GATE_TEST_CMD` - Override auto-detection (e.g., `GATE_TEST_CMD="npm run test:unit"`)
- `GATE_SKIP_TESTS` - Bypass gate entirely (set to "true")

**Example usage:**
```bash
# Normal operation
./test-gate.sh

# Override test command
GATE_TEST_CMD="poetry run pytest" ./test-gate.sh

# Skip tests
GATE_SKIP_TESTS=true ./test-gate.sh
```

### lint-gate.sh — Linter Gate

Runs linter before allowing stop. Auto-detects linter:

**Detection order:**
1. `npx eslint .` (if .eslintrc* or eslint.config.* exists)
2. `ruff check .` (if ruff.toml or pyproject.toml with [tool.ruff])
3. `cargo clippy` (if Cargo.toml exists)
4. `golangci-lint run` (if .golangci.yml exists)

**Behavior:**
- Linter passes → exit 0 (allow stop)
- Linter fails → output JSON block with reason

**Environment variables:**
- `GATE_LINT_CMD` - Override auto-detection
- `GATE_SKIP_LINT` - Bypass gate entirely (set to "true")

### review-gate.sh — Code Review Gate

Spawns a reviewer agent after builder completes work. Only activates when builder signals completion.

**Detection:**
Looks for completion signals in stdin:
- "task complete"
- "implementation done"
- "RALPH_COMPLETE"
- "builder complete"
- "work complete"

**Behavior:**
1. If no completion signal → exit 0 (not a builder stop)
2. If signal detected → spawn reviewer agent via `claude` CLI
3. Reviewer outputs REVIEW_PASS or REVIEW_FAIL
4. Pass → exit 0, Fail → output JSON block

**Environment variables:**
- `GATE_REVIEW_AGENT` - Reviewer agent name (default: "reviewer")
- `GATE_REVIEW_TIMEOUT` - Timeout in seconds (default: 120)
- `GATE_SKIP_REVIEW` - Bypass gate entirely (set to "true")

**Requirements:**
- `claude` CLI must be available in PATH
- Reviewer agent must be defined in `~/.claude/agents/`

## Composability: Stacking Gates

Hooks run in order defined in settings.json. First hook to output JSON "block" wins.

**Example: All three gates:**
```json
{
  "stopHooks": [
    "~/.claude/hooks/test-gate.sh",
    "~/.claude/hooks/lint-gate.sh",
    "~/.claude/hooks/review-gate.sh"
  ]
}
```

**Execution flow:**
1. test-gate.sh runs → if tests fail, blocks immediately
2. lint-gate.sh runs → if linter fails, blocks
3. review-gate.sh runs → if reviewer fails, blocks
4. All pass → stop allowed

**Selective gates per project:**
```json
{
  "stopHooks": [
    "~/.claude/hooks/test-gate.sh"
  ]
}
```

Only test gate active. Useful for projects without linters or where review is manual.

## Troubleshooting

**Hook not running:**
- Check file is executable: `ls -l ~/.claude/hooks/`
- Verify path in settings.json is correct
- Check Claude Code logs for hook errors

**Tests/linter not detected:**
- Set `GATE_TEST_CMD` or `GATE_LINT_CMD` explicitly
- Ensure config files (.eslintrc, pytest.ini, etc.) exist in project root

**Reviewer agent fails:**
- Ensure `claude` CLI is installed and in PATH
- Check reviewer agent exists: `ls ~/.claude/agents/reviewer.md`
- Increase timeout: `GATE_REVIEW_TIMEOUT=300`

**Want to bypass temporarily:**
```bash
# In your shell session
export GATE_SKIP_TESTS=true
export GATE_SKIP_LINT=true
export GATE_SKIP_REVIEW=true
```

Claude Code will inherit these env vars and skip gates.
