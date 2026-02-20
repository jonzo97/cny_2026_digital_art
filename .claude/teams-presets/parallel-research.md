# Team Preset: Parallel Research

Discovery-heavy workflow with parallel scouts and researchers feeding into a planner.

## When to Use

- Exploring an unfamiliar codebase before making changes
- Researching a technology decision with multiple angles
- Any task where "understand first, then plan" is the right approach

## Team Structure

| Role | Agent | Count | Model |
|------|-------|-------|-------|
| Lead | You (main Claude) | 1 | opus |
| Scout | scout | 1-2 | haiku |
| Researcher | research | 1-2 | sonnet |
| Planner | planner | 1 | opus |

## Task Flow

```
Phase 1: Discovery (parallel)
├── Scout A: Explore codebase structure, key files, architecture
├── Scout B: Explore tests, CI config, deployment setup (optional)
├── Research A: Search for best practices, library docs
└── Research B: Search for alternatives, known issues (optional)

Phase 2: Synthesis
└── Planner: Read all findings, create implementation plan with tasks
```

## Setup Steps

1. **Create team:**
   ```
   TeamCreate with team_name "research-<project>"
   ```

2. **Create discovery tasks:**
   ```
   TaskCreate: "Scout the codebase at <path>"
   TaskCreate: "Research best practices for <topic>"
   TaskCreate: "Research alternatives to <current approach>"
   ```

3. **Spawn teammates:**
   ```
   Task with team_name, subagent_type "scout", name "scout-1"
   Task with team_name, subagent_type "research", name "researcher-1"
   ```

4. **Create planning task (blocked by discovery):**
   ```
   TaskCreate: "Create implementation plan from findings"
   TaskUpdate: addBlockedBy [scout-task-id, research-task-id]
   ```

5. **Spawn planner** after discovery tasks complete.

## Tips

- Scouts finish fast (~2 min). Researchers take longer (~5 min). Spawn scouts first.
- Two scouts are useful for large codebases. One is fine for small projects.
- The planner should wait for ALL discovery to finish before starting.
- Keep total team size ≤ 4 agents to avoid coordination overhead.
