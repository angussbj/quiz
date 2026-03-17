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
3. Enter a worktree using the `EnterWorktree` tool with `branch: <branch-name>`. This creates the worktree, switches the shell's working directory to it, and creates the branch. Then run `npm install`.
4. Start the dev server (`npm run dev`) in the background and note the port.
5. Verify the setup: run `npm run typecheck` and `npm test`.

## Phase 2: Research

1. Read the type contracts and existing code relevant to this feature.
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
6. Proceed straight to phase 4. The user will give feedback after that.

## Phase 4: PR

1. Run final verification:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
2. Push the branch:
   ```bash
   git push -u origin <branch-name>
   ```
3. Take screenshots of the feature working in the browser (use the dev server you started). If the feature involves animations or interactions that can't be captured in a screenshot, describe what a screen recording would show and ask the user if they'd like one.
4. Create a PR with `gh pr create`. Include:
   - Summary of what was built
   - Screenshots
   - How to test it manually
   - Any known limitations or follow-up work
5. Share the PR URL with the user and ask for feedback.

## Phase 5: Feedback & Merge

1. Wait for user feedback on the PR.
2. If changes are requested: implement them, commit, push, and ask for another review.
3. When the user approves:
   ```bash
   gh pr merge <PR-number> --squash --delete-branch
   ```
4. Exit the worktree using the `ExitWorktree` tool (this cleans up the worktree automatically), then `git pull` from the main repo.
5. Confirm: "Feature merged and worktree cleaned up."
