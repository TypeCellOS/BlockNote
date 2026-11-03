import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./index.js";
import {
  blockFieldsById,
  createEditor,
  createSharedDocumentEditor,
  diffBlocks,
} from "./testUtil/fixtures.js";
import { canonicalText } from "./testUtil/canonical.js";
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
 * - Retention: blocks that an edit does not touch keep their ID, type, props
 *   and content.
 */

const documents = [
  { name: "shared test document", create: createSharedDocumentEditor },
  { name: "rich document", create: () => createEditor() },
];

/** The parts of a text (blocks at the top level), for the edits of the tests. */
type Codec = {
  split: (text: string) => string[];
  join: (parts: string[]) => string;
  /** A new paragraph with the text. */
  paragraph: (text: string) => string;
  /** Returns true if the part is a paragraph with one line of plain text. */
  isPlain: (part: string) => boolean;
  /** The part with `suffix` at the end of its text. */
  append: (part: string, suffix: string) => string;
};

/** Markdown and plain text: a blank line separates the parts. */
const blankLineCodec: Codec = {
  split: (text) => text.split("\n\n"),
  join: (parts) => parts.join("\n\n"),
  paragraph: (text) => text,
  isPlain: (part) => /^[A-Za-z][^\n]*$/.test(part),
  append: (part, suffix) => part + suffix,
};

/** HTML: the parts are the top-level elements. */
const htmlCodec: Codec = {
  split: (html) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    return [...template.content.children].map((element) => element.outerHTML);
  },
  join: (parts) => parts.join(""),
  paragraph: (text) => `<p>${text}</p>`,
  isPlain: (part) => /^<p>[A-Za-z][^<]*<\/p>$/.test(part),
  append: (part, suffix) => part.replace(/<\/p>$/, `${suffix}</p>`),
};

const formats = [
  { name: "markdown", format: markdownFormat, codec: blankLineCodec },
  { name: "plain text", format: plainTextFormat, codec: blankLineCodec },
  { name: "HTML", format: htmlFormat, codec: htmlCodec },
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
  describe.each(formats)("$name", ({ format, codec }) => {
    it("GetPut: a write of the text that the client read changes nothing", () => {
      const editor = create();
      const text = getDocumentText(editor, format);

      expect(valid(computeTextUpdate(editor, { format, text }))).toEqual({
        operations: [],
        warnings: [],
      });
      // This text is not equal to the text that the client read. Thus, it goes
      // through the full pipeline.
      expect(
        valid(computeTextUpdate(editor, { format, text: `\n${text}\n\n` })),
      ).toEqual({ operations: [], warnings: [] });
    });

    describe.each(edits)("$name", ({ apply, retention }) => {
      function editAndWrite() {
        const editor = create();
        const before = blockFieldsById(editor);
        const text = codec.join(
          apply(codec.split(getDocumentText(editor, format)), codec),
        );
        const update = valid(updateDocumentFromText(editor, { format, text }));
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
        expect(
          valid(computeTextUpdate(editor, { format, text })).operations,
        ).toEqual([]);
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
      valid(computeTextUpdate(editor, { format: markdownFormat, text }))
        .operations,
    ).toEqual([]);
  });
});
