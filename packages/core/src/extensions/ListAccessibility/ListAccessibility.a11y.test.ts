import { test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import {
  checkAriaSnapshot,
  openEditor,
} from "@root/tests/a11y/helpers.js";

test("nested and sibling list items expose list semantics", async () => {
  await openEditor([
    {
      id: "parent",
      type: "bulletListItem",
      content: "Parent item",
      children: [
        { id: "nested-one", type: "bulletListItem", content: "Nested one" },
        { id: "nested-two", type: "bulletListItem", content: "Nested two" },
      ],
    },
    { id: "sibling", type: "bulletListItem", content: "Sibling item" },
  ]);

  await checkAriaSnapshot(
    page.getByRole("textbox"),
    "nested and sibling list semantics",
  );
});

test("numbered list starts and nested numbering appear in the accessibility tree", async () => {
  await openEditor([
    {
      id: "first",
      type: "numberedListItem",
      props: { start: 4 },
      content: "First item",
      children: [
        { id: "nested-first", type: "numberedListItem", content: "Nested one" },
        { id: "nested-second", type: "numberedListItem", content: "Nested two" },
      ],
    },
    { id: "second", type: "numberedListItem", content: "Second item" },
  ]);

  await checkAriaSnapshot(
    page.getByRole("textbox"),
    "numbered list starts and nested list semantics",
  );
});

test("numbered list indexing restarts after a non-list block", async () => {
  await openEditor([
    { id: "first", type: "numberedListItem", content: "First" },
    { id: "second", type: "numberedListItem", content: "Second" },
    { id: "separator", type: "paragraph", content: "Separator" },
    { id: "restart", type: "numberedListItem", content: "Restart" },
  ]);

  await checkAriaSnapshot(
    page.getByRole("textbox"),
    "numbered list indexing restarts after separator",
  );
});
