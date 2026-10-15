# Placeholder render benchmark

Start Docker, then run this command from the repository root:

```sh
bash tests/a11y/benchmark-placeholders.sh
```

The script uses the shared browser-test Docker image, building it if needed. It compares `Placeholder.old.ts` (CSS placeholders) with `Placeholder.ts` (DOM placeholders) in Chromium using two documents: 1,000 empty paragraphs and 1,000 empty bullet list items. With the default behavior, paragraphs show one placeholder at the cursor, while every bullet item shows a placeholder.

Each implementation gets 5 warm-up runs and 30 measured runs per document, alternating execution order. Terminal output shows the old and new median render times and their percentage difference for each document. Render time includes editor creation, mounting, and layout. A positive delta means the new implementation takes longer.

The benchmark is excluded from normal test runs. Compare results from the same run and avoid other heavy workloads while measuring.
