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

3. Start the dev server — Vite automatically picks a free port:
   ```bash
   npm run dev
   ```
   Read the port from the Vite output.

4. Verify the setup:
   ```bash
   npm run typecheck
   npm test
   ```

## Cleanup

When done with a worktree:
```bash
cd /Users/angusjohnson/projects/quiz
git worktree remove ../quiz-worktrees/<branch-name>
```
