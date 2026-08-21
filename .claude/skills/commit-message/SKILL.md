---
name: commit-message
description: Write a one-line Conventional Commits message for the current changes and print it as a ready-to-copy `git commit -m "..."` command. Use when the user asks for a commit message, "dame el mensaje de commit", "un commit message de una línea", or similar — WITHOUT creating the commit. Accepts an optional `staged` or `all` argument to force which diff is described.
---

# Commit message

Produce a single-line Conventional Commits message describing the current changes, and hand it to the user as a command they can copy. **Never run `git commit`, `git add`, or any other state-changing git command.**

## Steps

1. Decide the scope of the diff to describe:
    - Default: if there are staged changes, describe **only** the staged ones — that is what the commit would contain. Otherwise describe the whole working tree, untracked files included.
    - `staged` argument (`/commit-message staged`): describe only `git diff --cached`. If nothing is staged, say so and stop — do not fall back to the working tree.
    - `all` argument (`/commit-message all`): describe staged + unstaged + untracked together, even when something is staged.

2. Inspect the changes with the commands that match that decision:
    - `git status --short`
    - `git diff --stat` and `git diff` (unstaged)
    - `git diff --cached --stat` and `git diff --cached` (staged)
    - For untracked files, read them directly — `git diff` does not show them.

3. Pick the `type` from the enum allowed by `.commitlintrc`:
   `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `wip`.

4. Pick an optional `scope` from the area touched, following the ones already used in this repo (`places`, `ui`, `layout`, ...). Check `git log --pretty=format:'%s' -30` if unsure. Omit the scope when the change is cross-cutting.

5. Write the subject:
    - English, imperative mood, first letter capitalized (matches this repo's history).
    - One line, no body, no footer, no trailing period.
    - Keep it under ~100 characters; `header-max-length` is disabled but short still wins.
    - Describe the _what_, not the file list. If several unrelated things changed, name the two or three that matter joined with "and", or say so and suggest splitting the commit.
    - Never add `Co-Authored-By` or any Claude/Anthropic attribution.

6. Output **only** the command, in a shell code block:

    ```sh
    git commit -m "feat(places): Show place photos in a carousel with lightbox"
    ```

    No preamble, no explanation, no alternatives list — unless the diff is genuinely ambiguous, in which case add one short line after the block explaining the assumption.

## Reference

Real examples from this repo:

- `feat(places): Add place_images table and restrict the images bucket`
- `fix(ui): Apply the Geist font, set the page language and restore the button cursor`
- `chore: set up Prettier, ESLint integration, husky and commitlint`
