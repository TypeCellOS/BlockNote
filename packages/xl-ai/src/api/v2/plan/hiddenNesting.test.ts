import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  updateDocumentFromText,
} from "../index.js";
import { columnSchema } from "../testUtil/fixtures.js";
import { valid } from "../testUtil/valid.js";

/**
 * Hard cases of the nesting rules of the planner (see `keptParent` and
 * `placeHiddenBlocks`): blocks that the format does not show (columns and
 * images in markdown, nesting in plain text), next to blocks that the text
 * moves. A differential test of two planners found them.
 */
describe("hidden blocks next to blocks that the text moves", () => {
  const schema = columnSchema;

  /** Writes the text, and returns the IDs of the document, with the children in brackets. */
  function write(
    initialContent: PartialBlock<any, any, any>[],
    format: TextFormat,
    text: (read: string) => string,
  ): string {
    const editor = BlockNoteEditor.create({ schema, initialContent });
    valid(
      updateDocumentFromText(editor, {
        base: "current",
        format,
        text: text(getDocumentText(editor, format)),
      }),
    );
    const shape = (blocks: readonly LensBlock[]): string =>
      blocks
        .map((block) =>
          block.children.length > 0
            ? `${block.id}[${shape(block.children)}]`
            : block.id,
        )
        .join(" ");
    return shape(editor.document as LensBlock[]);
  }
  const paragraph = (
    id: string,
    content: string,
    children: PartialBlock<any, any, any>[] = [],
  ): PartialBlock<any, any, any> => ({
    id,
    type: "paragraph",
    content,
    children,
  });
  const image = (id: string): PartialBlock<any, any, any> => ({
    id,
    type: "image",
    props: { url: `https://example.com/${id}.png` },
  });
  const columns = (
    id: string,
    ...blocks: PartialBlock<any, any, any>[][]
  ): PartialBlock<any, any, any> => ({
    id,
    type: "columnList",
    children: blocks.map((children, k) => ({
      id: `${id}-${k + 1}`,
      type: "column",
      children,
    })),
  });

  it("keeps a hidden image after the block before it, if the text moves that block", () => {
    expect(
      write(
        [paragraph("b", "bee"), image("i"), paragraph("c", "cee")],
        plainTextFormat,
        () => "cee\n\nbee",
      ),
    ).toBe("c b i");
  });

  it("keeps a hidden image after the block before it, if the text moves a block before that block", () => {
    expect(
      write(
        [
          paragraph("a", "aaa"),
          paragraph("b", "bee"),
          image("i"),
          paragraph("c", "cee"),
        ],
        plainTextFormat,
        () => "aaa\n\ncee\n\nbee",
      ),
    ).toBe("a c b i");
  });

  it("keeps the column list if the text moves the last block of a column to after it", () => {
    expect(
      write(
        [
          columns(
            "l",
            [paragraph("a", "aaa"), paragraph("x", "ex")],
            [paragraph("b", "bee")],
          ),
          paragraph("q", "queue"),
        ],
        markdownFormat,
        () => "aaa\n\nbee\n\nex\n\nqueue\n",
      ),
    ).toBe("l[l-1[a] l-2[b]] x q");
  });

  it("puts a block that the text moves between two column lists into the next column", () => {
    expect(
      write(
        [
          columns(
            "l",
            [paragraph("a", "aaa"), paragraph("x", "ex")],
            [paragraph("b", "bee")],
          ),
          columns("m", [paragraph("d", "dee")], [paragraph("e", "eee")]),
        ],
        markdownFormat,
        () => "aaa\n\nbee\n\nex\n\ndee\n\neee\n",
      ),
    ).toBe("l[l-1[a] l-2[b]] m[m-1[x d] m-2[e]]");
  });

  it("swaps two columns if the text moves the block of the first column between a block and its hidden child", () => {
    expect(
      write(
        [
          columns(
            "l",
            [paragraph("n", "enn")],
            [paragraph("b", "bee", [paragraph("k", "kay")])],
          ),
        ],
        plainTextFormat,
        () => "bee\n\nenn\n\nkay",
      ),
    ).toBe("l[l-2[b] l-1[n]] k");
  });

  it("does not move a top-level block into a column if the text moves it before its own hidden child", () => {
    expect(
      write(
        [
          paragraph("t", "tee", [paragraph("u", "you")]),
          columns("l", [paragraph("a", "aaa")], [paragraph("b", "bee")]),
        ],
        markdownFormat,
        () => "aaa\n\ntee\n\nyou\n\nbee\n",
      ),
    ).toBe("a t[u] b");
  });
});
