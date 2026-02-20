# Team Preset: Full Pipeline

Complete 5-agent pipeline: Scout → Research → Plan → Build → Review.
The maximalist approach for complex features.

## When to Use

- Large features requiring exploration, research, planning, and implementation
- When you want the full agent pipeline with minimal manual coordination
- Tasks where each phase genuinely benefits from a specialized agent

## When NOT to Use

- Simple bug fixes (just use builder directly)
- Tasks where you already know the codebase (skip scout)
- Research-only tasks (use parallel-research preset instead)

## Team Structure

| Role | Agent | Count | Model | Phase |
|------|-------|-------|-------|-------|
| Lead | You (main Claude) | 1 | opus | All |
| Scout | scout | 1 | haiku | 1 |
| Researcher | research | 1 | sonnet | 1 |
| Planner | planner | 1 | opus | 2 |
| Builder | builder | 1 | sonnet | 3 |
| Reviewer | reviewer | 1 | haiku | 4 |

## Task Flow

```
Phase 1: Discovery (parallel, ~3-5 min)
├── Scout: Explore codebase → Scout Report
└── Research: Investigate approach → Research Report

Phase 2: Planning (sequential, ~5 min)
└── Planner: Synthesize findings → Implementation Plan + TaskCreate

Phase 3: Build (sequential, ~10-30 min)
└── Builder: Implement plan tasks → Code changes + tests

Phase 4: Review (sequential, ~3 min)
└── Reviewer: Validate implementation → Review Report
    ├── PASS → Done, ship it
    └── FAIL → Fix tasks created → Builder picks up → Re-review
```

## Setup Steps

1. **Create team and all tasks upfront:**

   ```
   TeamCreate with team_name "pipeline-<feature>"

   # Phase 1 tasks (no blockers — start immediately)
   TaskCreate: "Scout codebase for <feature area>"
   TaskCreate: "Research best practices for <feature>"

   # Phase 2 task (blocked by Phase 1)
   TaskCreate: "Create implementation plan"
     → addBlockedBy: [scout-task, research-task]

   # Phase 3 task (blocked by Phase 2)
   TaskCreate: "Implement the plan"
     → addBlockedBy: [plan-task]

   # Phase 4 task (blocked by Phase 3)
   TaskCreate: "Review implementation"
     → addBlockedBy: [build-task]
   ```

2. **Spawn Phase 1 agents (parallel):**
   ```
   Task with team_name, subagent_type "scout", name "scout"
   Task with team_name, subagent_type "research", name "researcher"
   ```

3. **When Phase 1 completes, spawn Phase 2:**
   ```
   Task with team_name, subagent_type "planner", name "planner"
   ```

4. **When Phase 2 completes (plan approved), spawn Phase 3:**
   ```
   Task with team_name, subagent_type "builder", name "builder"
   ```

5. **When Phase 3 completes, spawn Phase 4:**
   ```
   Task with team_name, subagent_type "general-purpose", name "reviewer"
   ```

## Phase Transitions

Each phase transition is a natural checkpoint:

| Transition | Gate | Human Input |
|-----------|------|-------------|
| 1 → 2 | Both scout + research tasks completed | Optional: review findings |
| 2 → 3 | Plan created, tasks defined | **Recommended: approve plan** |
| 3 → 4 | All build tasks completed, tests pass | Optional: quick manual check |
| 4 → done | Review PASS | Optional: final review |

## Tips

- **Don't spawn all agents at once.** Phase dependencies exist for a reason.
- **Plan approval is the key checkpoint.** Always review the plan before Phase 3.
- For smaller features, skip Phase 1 (if you know the codebase) or skip Research (if the approach is clear).
- The `/pipeline` command automates this entire flow.
- For Serena projects, the builder and reviewer automatically use LSP-powered editing/review.

## Cost Estimate

Rough token usage per phase (varies by project size):
- Phase 1: ~15K tokens (scout: 5K, research: 10K)
- Phase 2: ~10K tokens
- Phase 3: ~30-80K tokens (depends on feature complexity)
- Phase 4: ~8K tokens
- **Total: ~60-110K tokens per pipeline run**
