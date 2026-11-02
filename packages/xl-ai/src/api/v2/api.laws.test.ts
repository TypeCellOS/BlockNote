import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./api.js";
import {
  blockFieldsById,
  createEditor,
  createSharedDocumentEditor,
  diffBlocks,
} from "./testUtil/fixtures.js";
import { canonicalText } from "./testUtil/canonical.js";

/**
 * The lens laws (see the README). The tests examine them on two documents, in
 * each format:
 *
 * - GetPut: if a client writes back the text that it read, nothing changes.
 * - PutGet: if the document did not change after the client read the text, a
 *   read after a write gives the written text. The format can normalize the
 *   text: two texts are equal if they render the same after a round trip.
 * - PutTwice: if a client writes the same text two times, the second write
 *   changes nothing.
 * - Retention: blocks that an edit does not touch keep their ID, type, props
 *   and content.
 */

const documents = [
  { name: "shared test document", create: createSharedDocumentEditor },
  { name: "rich document", create: () => createEditor() },
];

const formats = [
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
];

/** A paragraph of text with one line, in the two formats. */
const PLAIN_PARAGRAPH = /^[A-Za-z][^\n]*$/;

type Edit = {
  name: string;
  apply: (paragraphs: string[]) => string[];
  /** The number of blocks with changed fields that the edit can touch. */
  retention: "all-kept" | "one-changed" | "survivors-unchanged" | "none";
};

const edits: Edit[] = [
  {
    name: "insert a paragraph at the start",
    apply: (paragraphs) => ["Inserted paragraph", ...paragraphs],
    retention: "all-kept",
  },
  {
    name: "insert a paragraph in the middle",
    apply: (paragraphs) => {
      const middle = Math.floor(paragraphs.length / 2);
      return [
        ...paragraphs.slice(0, middle),
        "Inserted paragraph",
        ...paragraphs.slice(middle),
      ];
    },
    retention: "all-kept",
  },
  {
    name: "insert a paragraph at the end",
    apply: (paragraphs) => [...paragraphs, "Inserted paragraph"],
    retention: "all-kept",
  },
  {
    name: "change a paragraph",
    apply: (paragraphs) => {
      const index = paragraphs.findIndex((p) => PLAIN_PARAGRAPH.test(p));
      return paragraphs.map((p, i) => (i === index ? `${p} (edited)` : p));
    },
    retention: "one-changed",
  },
  {
    name: "remove a paragraph",
    apply: (paragraphs) => {
      const index = paragraphs.findIndex((p) => PLAIN_PARAGRAPH.test(p));
      return paragraphs.filter((_, i) => i !== index);
    },
    retention: "survivors-unchanged",
  },
  {
    name: "swap two paragraphs",
    apply: (paragraphs) => {
      const index = paragraphs.findIndex(
        (p, i) =>
          PLAIN_PARAGRAPH.test(p) &&
          PLAIN_PARAGRAPH.test(paragraphs[i + 1] ?? ""),
      );
      const result = [...paragraphs];
      [result[index], result[index + 1]] = [result[index + 1], result[index]];
      return result;
    },
    retention: "none",
  },
];

describe.each(documents)("$name", ({ create }) => {
  describe.each(formats)("$name", ({ format }) => {
    it("GetPut: a write of the text that the client read changes nothing", () => {
      const editor = create();
      const text = getDocumentText(editor, format);

      expect(computeTextUpdate(editor, { format, text })).toEqual({
        operations: [],
        warnings: [],
      });
      // This text is not equal to the text that the client read. Thus, it goes
      // through the full pipeline.
      expect(
        computeTextUpdate(editor, { format, text: `\n${text}\n\n` }),
      ).toEqual({ operations: [], warnings: [] });
    });

    describe.each(edits)("$name", ({ apply, retention }) => {
      function editAndWrite() {
        const editor = create();
        const before = blockFieldsById(editor);
        const text = apply(getDocumentText(editor, format).split("\n\n")).join(
          "\n\n",
        );
        const update = updateDocumentFromText(editor, { format, text });
        return { editor, before, text, update };
      }

      it("PutGet: a read gives the written text", () => {
        const { editor, text, update } = editAndWrite();
        expect(update.warnings).toEqual([]);
        expect(
          canonicalText(editor, format, getDocumentText(editor, format)),
        ).toBe(canonicalText(editor, format, text));
      });

      it("PutTwice: a second write of the same text changes nothing", () => {
        const { editor, text } = editAndWrite();
        expect(computeTextUpdate(editor, { format, text }).operations).toEqual(
          [],
        );
      });

      it("keeps the blocks that the edit does not touch", () => {
        const { editor, before } = editAndWrite();
        const { changed, removed } = diffBlocks(
          before,
          blockFieldsById(editor),
        );
        switch (retention) {
          case "all-kept":
            expect({ changed, removed }).toEqual({ changed: [], removed: [] });
            break;
          case "one-changed":
            expect(removed).toEqual([]);
            expect(changed).toHaveLength(1);
            break;
          case "survivors-unchanged":
            expect(changed).toEqual([]);
            break;
          case "none":
            break;
        }
      });
    });
  });
});

describe("markdown normalization", () => {
  it("bullets with `-` instead of `*` change nothing", () => {
    const editor = createSharedDocumentEditor();
    const text = getDocumentText(editor, markdownFormat).replace(
      /^(\s*)\* /gm,
      "$1- ",
    );
    expect(
      computeTextUpdate(editor, { format: markdownFormat, text }).operations,
    ).toEqual([]);
  });
});
