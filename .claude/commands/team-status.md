---
name: team-status
description: Show current team progress summary
---

# /team-status — Team Progress Dashboard

Quick overview of team state, task progress, and agent status.

## Instructions

When the user invokes `/team-status`, display:

### 1. Active Team

Read the team config from `~/.claude/teams/*/config.json` (find the active team).
Show team name and member list.

### 2. Task Summary

Call `TaskList` and display:

```
## Team Status: <team-name>

### Agents
| Name | Type | Status |
|------|------|--------|
| scout-1 | scout | idle |
| builder-1 | builder | working |

### Tasks
- Completed: N/M
- In Progress: X (owner: <name>)
- Blocked: Y (waiting on: <blocking task>)
- Pending: Z

### Recent Activity
- [timestamp] builder-1 completed "Implement auth module"
- [timestamp] reviewer-1 reported FAIL on "Review auth changes"
```

### 3. Recommendations

Based on task state, suggest next action:
- If blocked tasks exist: "Unblock task #X by completing #Y first"
- If idle agents exist: "Assign task #Z to idle agent <name>"
- If all tasks done: "All tasks complete — ready for final review"
