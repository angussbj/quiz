---
name: worktree-setup
description: Set up a git worktree for parallel feature development with isolated dev server
---

# Worktree Setup

Use this when starting work on a feature branch that needs isolation.

## Steps

1. Create worktree from the main repo:
   ```bash
   cd /Users/angusjohnson/projects/quiz
   git worktree add ../quiz-worktrees/<branch-name> -b <branch-name>
   ```

2. Install dependencies in the worktree:
   ```bash
   cd /Users/angusjohnson/projects/quiz-worktrees/<branch-name>
   npm install
   ```

3. Pick a unique port (5174–5180) and start dev server:
   ```bash
   npm run dev -- --port <PORT>
   ```

4. Verify the setup:
   ```bash
   npm run typecheck
   npm test
   ```

## Port Assignments

| Port | Branch / Feature |
|------|-----------------|
| 5173 | main (default) |
| 5174 | visualization-map |
| 5175 | visualization-timeline |
| 5176 | visualization-grid |
| 5177 | quiz-modes |
| 5178 | navigation |
| 5179 | persistence |
| 5180 | spare |

## Cleanup

When done with a worktree:
```bash
cd /Users/angusjohnson/projects/quiz
git worktree remove ../quiz-worktrees/<branch-name>
```
