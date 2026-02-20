# Team Preset: Build-Review Loop

Builder implements, reviewer validates, fix loop until PASS. The core quality pattern.

## When to Use

- Implementing features where quality matters (production code)
- Any task with clear acceptance criteria that can be mechanically verified
- When you want automated review without manual checking

## Team Structure

| Role | Agent | Count | Model |
|------|-------|-------|-------|
| Lead | You (main Claude) | 1 | opus |
| Builder | builder | 1 | sonnet |
| Reviewer | reviewer | 1 | haiku |

## Task Flow

```
Cycle 1:
├── Builder: Implement tasks, run tests, commit
└── Reviewer: Review changes, run tests, report PASS/FAIL
    ├── PASS → Done
    └── FAIL → Reviewer creates fix tasks → Cycle 2

Cycle 2 (if needed):
├── Builder: Fix issues from review
└── Reviewer: Re-review fixes
    ├── PASS → Done
    └── FAIL → Cycle 3 (max 3 cycles, then escalate to human)
```

## Setup Steps

1. **Create team:**
   ```
   TeamCreate with team_name "build-<feature>"
   ```

2. **Create implementation tasks** (from an approved plan):
   ```
   TaskCreate: "Implement <feature part 1>"
   TaskCreate: "Implement <feature part 2>"
   TaskCreate: "Review all implementation changes"
     → addBlockedBy: [impl-task-1, impl-task-2]
   ```

3. **Spawn builder:**
   ```
   Task with team_name, subagent_type "builder", name "builder-1"
   ```

4. **Spawn reviewer** (after builder finishes or as blocked task):
   ```
   Task with team_name, subagent_type "general-purpose", name "reviewer-1"
   ```

5. **Handle review results:**
   - PASS: Merge/commit, shut down team
   - FAIL: Reviewer creates fix tasks, builder picks them up automatically

## Tips

- Builder and reviewer should NOT work on the same files simultaneously.
- The reviewer is read-only — it creates fix tasks, it doesn't fix code.
- Max 3 review cycles. If still failing, escalate to human.
- For Serena-enabled projects, use serena/builder and serena/reviewer variants.
- Combine with Ralph (stop hook) for fully autonomous build loops.

## Integration with Ralph

For fully autonomous operation, install `ralph-v2.sh` as a stop hook on the builder.
The builder will keep working through tasks until Ralph's dual-condition gate confirms
both completion signal AND passing tests.

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/ralph-v2.sh",
        "timeout": 30
      }]
    }]
  }
}
```
