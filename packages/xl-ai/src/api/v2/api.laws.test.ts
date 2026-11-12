import type { Block } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { computeOperations, getDocumentText, updateDocument } from "./index.js";
import {
  blockFieldsById,
  createEditor,
  createSharedDocumentEditor,
  diffBlocks,
  documentShape,
} from "./testUtil/fixtures.js";
import { canonicalText } from "./testUtil/canonical.js";
import { type Codec, formatCases } from "./testUtil/codecs.js";
import { valid } from "./testUtil/valid.js";

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
 * - Retention: blocks that an edit does not touch keep their ID, type, props,
 *   content and nesting.
 */

const documents = [
  { name: "shared test document", create: createSharedDocumentEditor },
  { name: "rich document", create: () => createEditor() },
];

type Edit = {
  name: string;
  apply: (parts: string[], codec: Codec) => string[];
  /** The number of blocks with changed fields that the edit can touch. */
  retention: "all-kept" | "one-changed" | "survivors-unchanged" | "none";
};

const edits: Edit[] = [
  {
    name: "insert a paragraph at the start",
    apply: (parts, codec) => [codec.paragraph("Inserted paragraph"), ...parts],
    retention: "all-kept",
  },
  {
    name: "insert a paragraph in the middle",
    apply: (parts, codec) => {
      const middle = Math.floor(parts.length / 2);
      return [
        ...parts.slice(0, middle),
        codec.paragraph("Inserted paragraph"),
        ...parts.slice(middle),
      ];
    },
    retention: "all-kept",
  },
  {
    name: "insert a paragraph at the end",
    apply: (parts, codec) => [...parts, codec.paragraph("Inserted paragraph")],
    retention: "all-kept",
  },
  {
    name: "change a paragraph",
    apply: (parts, codec) => {
      const index = parts.findIndex(codec.isPlain);
      return parts.map((part, i) =>
        i === index ? codec.append(part, " (edited)") : part,
      );
    },
    retention: "one-changed",
  },
  {
    name: "remove a paragraph",
    apply: (parts, codec) => {
      const index = parts.findIndex(codec.isPlain);
      return parts.filter((_, i) => i !== index);
    },
    retention: "survivors-unchanged",
  },
  {
    name: "swap two paragraphs",
    apply: (parts, codec) => {
      const index = parts.findIndex(
        (part, i) => codec.isPlain(part) && codec.isPlain(parts[i + 1] ?? ""),
      );
      const result = [...parts];
      [result[index], result[index + 1]] = [result[index + 1], result[index]];
      return result;
    },
    retention: "none",
  },
];

describe.each(documents)("$name", ({ create }) => {
  describe.each(formatCases)("$name", ({ format, codec }) => {
    it("GetPut: a write of the text that the client read changes nothing", () => {
      const editor = create();
      const text = getDocumentText(editor, format);

      expect(
        valid(computeOperations(editor, { base: "current", format, text })),
      ).toEqual({
        operations: [],
        warnings: [],
      });
      // This text is not equal to the text that the client read. Thus, it goes
      // through the full pipeline.
      expect(
        valid(
          computeOperations(editor, {
            base: "current",
            format,
            text: `\n${text}\n\n`,
          }),
        ),
      ).toEqual({ operations: [], warnings: [] });
    });

    it.each(edits)(
      "$name: PutGet, PutTwice and retention",
      ({ apply, retention }) => {
        const editor = create();
        const before = blockFieldsById(editor);
        const shape = documentShape(editor.document);
        const text = codec.join(
          apply(codec.split(getDocumentText(editor, format)), codec),
        );
        const update = valid(
          updateDocument(editor, { base: "current", format, text }),
        );

        // PutGet: a read gives the written text.
        expect(update.warnings).toEqual([]);
        expect(
          canonicalText(editor, format, getDocumentText(editor, format)),
        ).toBe(canonicalText(editor, format, text));

        // PutTwice: a second write of the same text changes nothing.
        expect(
          valid(computeOperations(editor, { base: "current", format, text }))
            .operations,
        ).toEqual([]);

        // Retention: the blocks that the edit does not touch stay, with
        // their fields and their nesting.
        const { changed, removed } = diffBlocks(
          before,
          blockFieldsById(editor),
        );
        const keptShape = shapeOf(editor.document, new Set(before.keys()));
        switch (retention) {
          case "all-kept":
            expect({ changed, removed }).toEqual({ changed: [], removed: [] });
            expect(keptShape).toEqual(shape);
            break;
          case "one-changed":
            expect(removed).toEqual([]);
            expect(changed).toHaveLength(1);
            expect(keptShape).toEqual(shape);
            break;
          case "survivors-unchanged":
            expect(changed).toEqual([]);
            break;
          case "none":
            break;
        }
      },
    );
  });
});

/**
 * The shape of the document (see `documentShape`) with only the blocks in
 * `ids`. The children of another block (a new block) take its place.
 */
function shapeOf(
  blocks: Block<any, any, any>[],
  ids: ReadonlySet<string>,
): unknown[] {
  return blocks.flatMap((block) => {
    const children = shapeOf(block.children, ids);
    if (!ids.has(block.id)) {
      return children;
    }
    return children.length > 0 ? [block.id, children] : [block.id];
  });
}
