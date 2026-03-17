---
name: feature-dev
description: Develop a feature end-to-end — worktree, implementation, PR with screenshots, feedback, merge. Invoke with /feature-dev <number> where number matches docs/features.md.
---

# Feature Development

Develop a feature from docs/features.md end-to-end.

## Arguments

Takes a feature number (e.g., `/feature-dev 1`). Read `docs/features.md` to find the feature by number. If the number doesn't match, ask the user which feature they mean.

## Phase 1: Setup

1. Read `docs/features.md` and find the feature.
2. Announce: "Starting feature: **<title>**" and summarise the scope in 1–2 sentences.
3. Enter a worktree using the `EnterWorktree` tool with a short name for the feature (e.g., `csv-loader`). This creates the worktree and branch (`worktree-<name>`), and switches the shell's working directory to it. Then run `npm install`.
4. Start the dev server (`npm run dev`) and note the port. It will run in the background automatically. **DO NOT** add `&` to get it to run in the background.
5. Verify the setup: run `npm run typecheck` and `npm test`.

## Phase 2: Research

1. Read the type contracts and existing code relevant to this feature. Read from the worktree, not the main branch - use relative paths not absolute paths.
2. Read the project CLAUDE.md for conventions.
3. Understand how this feature fits into the three-tier architecture.
4. Ask the user clarifying questions about anything ambiguous in the feature spec. Don't assume — ask. Keep questions focused and specific.

## Phase 3: Implement

1. Work in small increments. After each meaningful change:
   - Run `npm run typecheck` and `npm test`
   - Fix any issues before moving on
   - Commit with a conventional commit message
2. Create CSS modules alongside components. Use theme CSS custom properties for all colours.
3. Write tests as you go — don't leave them all to the end.
4. If you get stuck or uncertain about a design decision, ask the user rather than guessing.
5. Document the code as you go, so that other agents can find it and understand how things work. Add to or create new .md files in `docs`, and mention new files in CLAUDE.md (or one of the other files if it's too detailed) so that agents can automatically find these docs.
6. Update `docs/features.md` if anything you've done or learned affects other features. Examples: design decisions that change how a downstream feature should be implemented, new testing that should happen as part of another feature (e.g., "visually test X when feature Y is built"), API changes that alter assumptions in other feature specs, or notes/warnings for whoever picks up a dependent feature.
7. Mark the feature as done in `docs/features.md` by adding **DONE** to the feature heading (e.g., `### 1. CSV Data Loader — DONE`).

## Phase 4: Self-Review

1. Launch the `local-code-review` agent (from `.claude/agents/local-code-review.md`). In the prompt, give it:
   - The feature spec from `docs/features.md`
   - The user's answers to your clarifying questions from Phase 2
   - **Do NOT** include your own reasoning, design notes, or implementation plans — let the reviewer form their own opinions from the code and spec alone. The agent knows to read the diff and CLAUDE.md itself.
2. Review the agent's feedback. Where you agree, make the changes and commit. Where you disagree, think carefully about whether the reviewer has a point you missed. If there's a genuine disagreement about the best approach, briefly present both sides to the user and ask them to decide.

## Phase 5: PR

1. Run final verification:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
2. Push the branch (use `git rev-parse --abbrev-ref HEAD` if you need the branch name).
3. If the feature has visual output, take screenshots of it working in the browser. 
  3a. If it's all wired up, take screenshots using the dev server you started. Otherwise create a storybook, run it, and use it for screenshots.
  3b. If it involves animations or interactions that can't be captured in a screenshot, create a screen recording. 
  3c. Pure logic features (parsers, scoring, etc.) can skip screenshots. Save all screenshots and screen recordings to a `screenshots/` directory in the worktree root (create it if it doesn't exist).
4. Create a PR with `gh pr create`. Include:
   - Summary of what was built
   - Screenshots (if applicable)
   - How to test it manually
   - Any known limitations or follow-up work
5. Share the PR URL with the user and ask for feedback.

## Phase 6: Feedback & Merge

1. Delete any screenshots from `screenshots/` that show intermediate broken states that were later fixed — only keep screenshots of the final working state. Then open the directory in Finder with `open screenshots/` so the user can drag them into the PR.
2. Wait for user feedback on the PR.
3. If changes are requested: return to Phase 3 to re-implement them, and follow all the steps to check, re-review, commit, push, update the PR description, etc.
4. When the user approves, merge from inside the worktree:
   ```bash
   gh pr merge <PR-number> --squash --delete-branch
   ```
   This will error with `fatal: 'main' is already checked out at ...` — that's expected when running from a worktree. The merge still succeeds via the GitHub API. You can verify with `gh pr view <PR-number> --json state`.
5. Before exiting the worktree, copy any new permissions from `.claude/settings.local.json` in the worktree into `.claude/settings.local.json` on the main branch (merge, don't overwrite — the main branch file may have entries the worktree doesn't).
6. Exit the worktree using the `ExitWorktree` tool (this cleans up the worktree automatically), then `git pull` from the main repo, stashing, rebasing and resolving conflicts if necessary.
7. Check that the worktree directory under `.claude/worktrees/<name>` is fully removed. Tools like Playwright can leave behind directories (e.g. `.playwright-mcp`) that survive the git worktree cleanup. If the directory still exists, `rm -rf` it.
8. Check if there's anything important in your context that shouldn't be forgotten, and find somewhere to write it for future agents, like in the `features.md`, `CLAUDE.md` or other `docs/`. The user will check and commit these changes later.
9. Confirm: "Feature merged and worktree cleaned up."
