---
name: backlog-grooming
description: Use when collecting user feedback about bugs/improvements, cleaning up completed features from docs/features.md, or structuring work items into parallelisable agent tasks. Also use when user says "skip to feedback" to go directly to feedback collection.
---

# Backlog Grooming

Collect user feedback, maintain `docs/features.md`, and structure work into parallelisable chunks for the `feature-dev` skill.

## Phases

Three phases. The user may ask to skip to a specific phase (e.g. "skip to feedback" → Phase 2).

### Phase 1: Clean Up Done Features

Skip to Phase 2 if `docs/features.md` has no items marked **DONE**.

1. Read all files in `docs/` and `.claude/CLAUDE.md`.
2. For each DONE feature, check whether its notes contain architectural decisions, conventions, gotchas, or patterns not already documented elsewhere.
3. Extract undocumented information into appropriate doc files. Create new files if needed — don't bloat existing ones. Where `features.md` disagrees with the actual implementation, use the implementation as the source of truth.
4. If a DONE item has "Note from #X" entries that are relevant to a non-DONE feature, move those notes onto the non-DONE feature before removing the DONE item.
5. Spin up a review subagent: *"Read features.md DONE items and verify all useful information is captured in [doc files]. Report: missing info, redundancies, verdict on whether DONE items can be removed."*
6. Address any gaps. Iterate with the subagent until it gives a clean verdict.
7. Remove DONE items from `features.md`. Leave non-DONE items.
8. Update doc references in `CLAUDE.md` if new docs were created.

**What to extract:** Architectural decisions, conventions, gotchas, patterns future agents need.
**What NOT to extract:** Original scope descriptions, branch names, file lists — the code is the source of truth for what was built.

### Phase 2: Collect Feedback

**Before accepting feedback:** Read all files in `docs/` and `.claude/CLAUDE.md` so you understand the current architecture, conventions, and what's already been built. This context is essential for writing precise task descriptions.

Accept feedback from the user. For each piece:

1. If the feedback is ambiguous or underspecified, investigate before writing it down — read relevant source code, then ask the user targeted questions to clarify intent, scope, and expected behavior. The goal is to write task descriptions precise enough that an agent can implement them without needing to ask the user what was meant.
2. Identify which area it belongs to (existing section in `features.md` or new section).
3. Add it to `features.md` with a clear, specific description — include enough context for an agent to understand and fix the issue without further clarification.
4. If the feedback relates to an existing non-DONE feature, add it as a note on that feature.
5. **Never add instructions to a feature marked DONE** — if the user wants changes to done work, create a new item.
6. Continue collecting until the user says they're finished.

### Phase 3: Structure for Parallel Agents

When the user is done adding feedback:

1. Group items by area and dependency into numbered features.
2. Each feature must be independently workable by an agent in a worktree — self-contained scope, no shared state with other in-progress features.
3. Number features to avoid collision with existing feature numbers in `features.md`.
4. Organize into dependency groups:
   - Items within a group can be worked on in parallel.
   - Later groups depend on earlier ones.
   - Note specific cross-group dependencies (e.g. "depend on #19 for map fixes").
5. Each feature gets: number, heading, and scope description. Match the existing format in `features.md`.

The output must be compatible with the `feature-dev` skill — an agent picks up work with `/feature-dev <number>`.
