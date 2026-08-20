---
name: github-issues
description: Scan the BlockNote GitHub repository for issues and PRs relevant to the current task. Use when starting work on a new feature, bug fix, or other code modification.
---

This skill searches the BlockNote GitHub repository for existing issues and PRs that are relevant to the task at hand.

# When to use

Use this skill when prompted to write a new feature, fix a bug, or make some other modification to the code. It should be invoked before writing any code to surface relevant context from the project's issue tracker.

# Steps

1. Use the GitHub CLI (`gh`) to search for issues and PRs in the repository that are relevant to the user's task. Search both open and closed issues/PRs using relevant keywords.
2. Summarize the findings:
   - If nothing relevant is found, report that and proceed with the task.
   - If relevant issues or PRs are found, present a summary and prompt the user on next steps before writing code.
3. Once the task is completed, remind the user of the relevant issues and PRs found during this initial investigation so they can be referenced or closed as appropriate.
