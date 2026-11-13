# Placeholder render benchmark

Start Docker, then run this command from the repository root:

```sh
bash tests/a11y/benchmark-placeholders.sh
```

The script uses the shared browser-test Docker image, building it if needed. It compares `Placeholder.old.ts` (CSS placeholders) with `Placeholder.ts` (DOM placeholders) in Chromium using two documents: 1,000 empty paragraphs and 1,000 empty bullet list items. With the default behavior, paragraphs show one placeholder at the cursor, while every bullet item shows a placeholder.

Each implementation gets 5 warm-up runs and 30 measured runs per document, alternating execution order. Terminal output shows the old and new median render times and their percentage difference for each document. Three operations are measured on each fresh editor:

- **Initial render:** editor creation, mounting, and forced layout.
- **Selection change:** move the cursor from the first block to block 500, then force layout.
- **Content change:** insert one character at that cursor using a ProseMirror transaction, then force layout. This removes the selected block's placeholder and invalidates the DOM implementation's document cache.

Timings include synchronous rendering and style/layout, but not paint or animation-frame waits. Placeholder counts and the resulting selection/content are validated outside the timed regions. A positive delta means the DOM implementation takes longer.

The benchmark is excluded from normal test runs. Compare results from the same run and avoid other heavy workloads while measuring.
