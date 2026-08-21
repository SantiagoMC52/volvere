---
name: commit-message
description: Write a one-line Conventional Commits message for the current changes and print it as a ready-to-copy `git commit -m "..."` command. Use when the user asks for a commit message, "dame el mensaje de commit", "un commit message de una línea", or similar — WITHOUT creating the commit.
---

# Commit message

Produce a single-line Conventional Commits message describing the current changes, and hand it to the user as a command they can copy. **Never run `git commit`, `git add`, or any other state-changing git command.**

## Steps

1. Inspect the changes:
    - `git status --short`
    - `git diff --stat` and `git diff` (unstaged)
    - `git diff --cached` (staged)

    If there are staged changes, describe **only** the staged ones — that is what the commit would contain. Otherwise describe the whole working tree.

2. Pick the `type` from the enum allowed by `.commitlintrc`:
   `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `wip`.

3. Pick an optional `scope` from the area touched, following the ones already used in this repo (`places`, `ui`, `layout`, ...). Check `git log --pretty=format:'%s' -30` if unsure. Omit the scope when the change is cross-cutting.

4. Write the subject:
    - English, imperative mood, first letter capitalized (matches this repo's history).
    - One line, no body, no footer, no trailing period.
    - Keep it under ~100 characters; `header-max-length` is disabled but short still wins.
    - Describe the _what_, not the file list. If several unrelated things changed, name the two or three that matter joined with "and", or say so and suggest splitting the commit.
    - Never add `Co-Authored-By` or any Claude/Anthropic attribution.

5. Output **only** the command, in a shell code block:

    ```sh
    git commit -m "feat(places): Show place photos in a carousel with lightbox"
    ```

    No preamble, no explanation, no alternatives list — unless the diff is genuinely ambiguous, in which case add one short line after the block explaining the assumption.

## Reference

Real examples from this repo:

- `feat(places): Add place_images table and restrict the images bucket`
- `fix(ui): Apply the Geist font, set the page language and restore the button cursor`
- `chore: set up Prettier, ESLint integration, husky and commitlint`
