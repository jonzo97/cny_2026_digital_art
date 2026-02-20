---
name: pipeline
description: Orchestrate the full agent pipeline (scout → research → plan → build → review)
---

# /pipeline — Full Agent Pipeline

Orchestrate a complete agent pipeline for a task. Creates a team, spawns agents in phases, and manages the full lifecycle.

## Usage

```
/pipeline <task description>
/pipeline plan-only <task description>
/pipeline build-only <task description>
```

## Instructions

When the user invokes `/pipeline <task>`, execute the following orchestration:

### 1. Setup

- Create a team: `TeamCreate` with team_name `pipeline-<short-task-slug>`
- Announce: "Starting pipeline for: <task>"

### 2. Determine Scope

- **Full pipeline** (default): All 4 phases
- **plan-only**: Phases 1-2 only (discovery + planning). Stop after plan is created.
- **build-only**: Phases 3-4 only (build + review). Assumes plan already exists in TodoWrite.

### 3. Phase 1: Discovery (parallel)

Create and run in parallel:

```
TaskCreate: "Scout the codebase for <relevant area>"
TaskCreate: "Research best practices/approach for <task>"
```

Spawn both agents simultaneously:
```
Task with team_name, subagent_type "scout", name "scout-1", model "haiku"
Task with team_name, subagent_type "research", name "researcher-1", model "sonnet"
```

Wait for both to complete. Collect findings.

### 4. Phase 2: Planning

Create planning task (blocked by discovery):
```
TaskCreate: "Create implementation plan from scout and research findings"
```

Spawn planner:
```
Task with team_name, subagent_type "planner", name "planner-1", model "opus"
```

**CHECKPOINT: Present the plan to the user for approval before proceeding.**

If `plan-only` scope: stop here, show plan summary, clean up team.

### 5. Phase 3: Build

After plan approval, spawn builder:
```
Task with team_name, subagent_type "builder", name "builder-1", model "sonnet"
```

The builder works through all tasks created by the planner. Monitor via TaskList.

### 6. Phase 4: Review

After builder completes all tasks, spawn reviewer:
```
Task with team_name, subagent_type "general-purpose", name "reviewer-1", model "haiku"
```

Handle review results:
- **PASS**: Report success, clean up team
- **FAIL**: Create fix tasks from review feedback, re-spawn builder, then re-review (max 3 cycles)

### 7. Completion

- Summarize what was done: files changed, tests passing, key decisions
- Send shutdown_request to all teammates
- Clean up team with TeamDelete
- Report final status

## Progress Reporting

After each phase transition, report:
```
Pipeline: <task>
Phase 1/4: Discovery ✓ (scout: done, research: done)
Phase 2/4: Planning ✓ (plan approved)
Phase 3/4: Building... (3/7 tasks complete)
Phase 4/4: Pending
```

## Error Handling

- If any agent fails or gets stuck, report the issue and ask the user what to do
- If the review cycle exceeds 3 iterations, stop and escalate to human
- If the user cancels at any checkpoint, shut down the team gracefully
