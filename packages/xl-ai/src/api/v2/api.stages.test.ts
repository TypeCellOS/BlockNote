import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { computeOperations, getDocumentText } from "./api.js";
import { markdownFormat } from "./formats/markdown.js";
import { plainTextFormat } from "./formats/plainText.js";
import type { TextFormat } from "./formats/types.js";
import { textStages, withNewIdPlaceholders } from "./testUtil/stages.js";
import { valid } from "./testUtil/valid.js";

/**
 * The data of each stage of a write, for core examples (see "Pipeline" in
 * the README). The snapshots are documentation that the tests keep correct.
 * Each test also examines that the stages give the operations of
 * `computeOperations`.
 */
function stagesOf(
  initialContent: PartialBlock[],
  format: TextFormat,
  /** The change of the client to the text that it read. */
  edit: (text: string) => string,
) {
  const editor = BlockNoteEditor.create({ initialContent });
  const text = edit(getDocumentText(editor, format));
  const stages = textStages(editor, format, text);
  expect(stages.operations).toEqual(
    withNewIdPlaceholders(
      valid(computeOperations(editor, { base: "current", format, text }))
        .operations,
    ),
  );
  return stages;
}

describe("the stages of a write", () => {
  it("keeps a color that markdown does not show, when the text changes a word", () => {
    expect(
      stagesOf(
        [
          {
            id: "a",
            type: "paragraph",
            props: { textColor: "red" },
            content: "Hello world",
          },
          { id: "b", type: "paragraph", content: "Second" },
        ],
        markdownFormat,
        (text) => text.replace("world", "brave world"),
      ),
    ).toMatchInlineSnapshot(`
      {
        "invisible": [],
        "operations": [
          {
            "id": "a",
            "type": "update",
            "update": {
              "content": [
                {
                  "styles": {},
                  "text": "Hello brave world",
                  "type": "text",
                },
              ],
            },
          },
        ],
        "pairs": [
          [
            "Hello world",
            "Hello brave world",
          ],
          [
            "Second",
            "Second",
          ],
        ],
        "rows": [
          [
            "kept",
            "a",
            "Hello brave world",
          ],
          [
            "kept",
            "b",
            "Second",
          ],
        ],
        "view": [
          [
            "a",
            "paragraph",
            "Hello world",
          ],
          [
            "b",
            "paragraph",
            "Second",
          ],
        ],
        "warnings": [],
      }
    `);
  });

  it("inserts a new block and removes a block that the text does not have", () => {
    expect(
      stagesOf(
        [
          { id: "a", type: "paragraph", content: "Alpha" },
          { id: "b", type: "paragraph", content: "Beta" },
          { id: "c", type: "paragraph", content: "Gamma" },
        ],
        markdownFormat,
        (text) => text.replace("Beta", "New\n\nBeta").replace("Gamma", ""),
      ),
    ).toMatchInlineSnapshot(`
      {
        "invisible": [],
        "operations": [
          {
            "block": {
              "children": [],
              "content": [
                {
                  "styles": {},
                  "text": "New",
                  "type": "text",
                },
              ],
              "id": "(new)",
              "props": {
                "backgroundColor": "default",
                "textAlignment": "left",
                "textColor": "default",
              },
              "type": "paragraph",
            },
            "placement": "after",
            "reference": "a",
            "type": "insert",
          },
          {
            "id": "c",
            "type": "delete",
          },
        ],
        "pairs": [
          [
            "Alpha",
            "Alpha",
          ],
          [
            "Beta",
            "Beta",
          ],
        ],
        "rows": [
          [
            "kept",
            "a",
            "Alpha",
          ],
          [
            "new",
            undefined,
            "New",
          ],
          [
            "kept",
            "b",
            "Beta",
          ],
        ],
        "view": [
          [
            "a",
            "paragraph",
            "Alpha",
          ],
          [
            "b",
            "paragraph",
            "Beta",
          ],
          [
            "c",
            "paragraph",
            "Gamma",
          ],
        ],
        "warnings": [],
      }
    `);
  });

  it("merges a change of a code block with a blank line into the block, in plain text", () => {
    // Plain text shows the blank line as one newline. The merge keeps the
    // blank line, because the client did not change the text next to it.
    expect(
      stagesOf(
        [{ id: "code", type: "codeBlock", content: "one\n\ntwo" }],
        plainTextFormat,
        (text) => text.replace("two", "two, changed"),
      ),
    ).toMatchInlineSnapshot(`
      {
        "invisible": [],
        "operations": [
          {
            "id": "code",
            "type": "update",
            "update": {
              "content": [
                {
                  "styles": {},
                  "text": "one

      two, changed",
                  "type": "text",
                },
              ],
            },
          },
        ],
        "pairs": [
          [
            "one
      two",
            "one
      two, changed",
          ],
        ],
        "rows": [
          [
            "kept",
            "code",
            "one
      two, changed",
          ],
        ],
        "view": [
          [
            "code",
            "paragraph",
            "one
      two",
          ],
        ],
        "warnings": [],
      }
    `);
  });

  it("keeps a nesting that markdown does not show", () => {
    // Markdown cannot nest a paragraph in a paragraph: the view shows the
    // child at the top level.
    expect(
      stagesOf(
        [
          {
            id: "intro",
            type: "paragraph",
            content: "Intro",
            children: [{ id: "note", type: "paragraph", content: "A note" }],
          },
        ],
        markdownFormat,
        (text) => text.replace("A note", "A note, changed"),
      ),
    ).toMatchInlineSnapshot(`
      {
        "invisible": [],
        "operations": [
          {
            "id": "note",
            "type": "update",
            "update": {
              "content": [
                {
                  "styles": {},
                  "text": "A note, changed",
                  "type": "text",
                },
              ],
            },
          },
        ],
        "pairs": [
          [
            "Intro",
            "Intro",
          ],
          [
            "A note",
            "A note, changed",
          ],
        ],
        "rows": [
          [
            "kept",
            "intro",
            "Intro",
          ],
          [
            "kept",
            "note",
            "A note, changed",
          ],
        ],
        "view": [
          [
            "intro",
            "paragraph",
            "Intro",
          ],
          [
            "note",
            "paragraph",
            "A note",
          ],
        ],
        "warnings": [],
      }
    `);
  });
});
