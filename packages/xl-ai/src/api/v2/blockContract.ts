import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";

import { computeOperations } from "./api.js";
import type { TextFormat } from "./formats/index.js";
import type { LensBlock } from "./model.js";

/** One text format, with a name for the messages of {@link assertBlockContract}. */
export type NamedFormat = { name: string; format: TextFormat };

/** The text of one example block in one format (see {@link assertBlockContract}). */
export type BlockContractText = {
  /** The name of the format. */
  format: string;
  /** The type of the example block. */
  type: string;
  /** The text of the block alone, or `undefined` if the format does not show the block. */
  text: string | undefined;
  /**
   * The data of the block that does not read back from the text: the names
   * of its props with a different value, and `"content"` for different
   * content. The lens keeps this data when a client writes the text back,
   * but a client cannot see or change it.
   */
  hidden: string[];
};

/** The words of the two paragraphs around the example block. No block type shows them as its own text. */
const BEFORE = "Paragraph before the block.";
const AFTER = "Paragraph after the block.";

/**
 * Examines the contract of the text lens for block authors (see the README,
 * "Contract for block authors") on example blocks of custom block types, in
 * each format. Call it in a test of your block types. It throws an `Error`
 * that names the rule, the block type and the format, for the rules that a
 * program can examine:
 *
 * - Rule 2: the text of one block reads back as one block, apart from the
 *   blocks around it.
 * - Rule 4: the block reads back with the same type.
 * - Rule 5: the export of the block does not throw.
 * - Rule 6: two different example blocks of one type do not give the same
 *   text.
 * - Rule 8: the format shows the block, unless `hiddenIn` names the format.
 * - A write of the unchanged text does not change the document, and a change
 *   of the paragraph before the block does not change the block.
 *
 * The lens also throws its own errors for a block that breaks rule 2 or
 * rule 5. This function does not catch them: the test fails with that error.
 *
 * The result is the text of each example block in each format, and the
 * data of the block that the text does not show. A program cannot examine
 * rule 1 (the same export in each environment) and rule 3 (no UI text in
 * the export) in one environment. Compare the result of an editor without a
 * view with the result of a mounted editor (rule 1), and read the texts and
 * the hidden data, for example in a snapshot (rules 3 and 4).
 */
export function assertBlockContract(
  /** An editor with the schema of the block types. Its document does not change. */
  editor: BlockNoteEditor<any, any, any>,
  options: {
    /**
     * The example blocks: for each block type, some blocks with different
     * props and content. The check is for each block alone, without its
     * children. A layout block (a block that only groups its children) is
     * not a subject of this check (rule 7).
     */
    blocks: readonly PartialBlock<any, any, any>[];
    formats: readonly NamedFormat[];
    /** The names of the formats that do not show the example blocks, by intent (rule 8). */
    hiddenIn?: readonly string[];
  },
): BlockContractText[] {
  const hiddenIn = new Set(options.hiddenIn ?? []);
  const texts: BlockContractText[] = [];
  for (const { name, format } of options.formats) {
    const shown = new Map<string, string>();
    for (const example of options.blocks) {
      const { text, hidden } = examineBlock(editor, example, { name, format });
      texts.push({ format: name, type: String(example.type), text, hidden });
      if (text === undefined) {
        if (!hiddenIn.has(name)) {
          throw contractError(
            8,
            example,
            name,
            "the format does not show the block. A client of this format cannot see or change its data, and removes the block together with its parent. If this is correct for the block type, add the format to `hiddenIn`.",
          );
        }
        continue;
      }
      if (hiddenIn.has(name)) {
        throw contractError(
          8,
          example,
          name,
          "the format shows the block, but `hiddenIn` names the format.",
        );
      }
      const json = JSON.stringify(example);
      const other = shown.get(text);
      if (other !== undefined && other !== json) {
        throw contractError(
          6,
          example,
          name,
          `two different example blocks give the same text (${JSON.stringify(text)}). Blocks with equal text have a weak identity: export the data that makes a block different from the other blocks of its type.`,
        );
      }
      shown.set(text, json);
    }
  }
  return texts;
}

/**
 * Examines one example block in one format, in a document of its own: a
 * paragraph, the block (without its children), a paragraph. Returns the
 * text of the block alone (`undefined` if the format does not show the
 * block), and the data of the block that does not read back.
 */
function examineBlock(
  editor: BlockNoteEditor<any, any, any>,
  example: PartialBlock<any, any, any>,
  { name, format }: NamedFormat,
): { text: string | undefined; hidden: string[] } {
  const copy = editorWith(editor, [
    { type: "paragraph", content: BEFORE },
    { ...example, children: [] },
    { type: "paragraph", content: AFTER },
  ]);
  const source: LensBlock[] = copy.document;
  // Rule 5: an export that throws stops here, with the error of the export.
  const text = format.serialize(copy, source);
  const back = blockOfView(editor, format.parse(copy, text), example, name);
  assertWrites(copy, source[0].id, text, { name, format }, example);
  if (back === undefined) {
    return { text: undefined, hidden: [] };
  }
  return {
    text: format.serialize(copy, [source[1]]),
    hidden: hiddenDataOf(back, source[1], example, name),
  };
}

/**
 * Rule 2: the text reads back as the two paragraphs with one block between
 * them (returns that block, in the stored form), or with no block between
 * them (returns `undefined`: the format does not show the block).
 */
function blockOfView(
  editor: BlockNoteEditor<any, any, any>,
  parsed: readonly LensBlock[],
  example: PartialBlock<any, any, any>,
  format: string,
): LensBlock | undefined {
  // The stored form: through an editor, as the document stores the blocks.
  const view: LensBlock[] =
    parsed.length === 0 ? [] : editorWith(editor, parsed).document;
  if (
    (view.length !== 2 && view.length !== 3) ||
    textOf(view[0]) !== BEFORE ||
    textOf(view[view.length - 1]) !== AFTER
  ) {
    const blocks = view.map(
      (block) => `${block.type} ${JSON.stringify(textOf(block))}`,
    );
    throw contractError(
      2,
      example,
      format,
      `the text of a paragraph, the block and a paragraph reads back as ${view.length} blocks (${blocks.join(", ")}). The export of one block must read back as one block, apart from the blocks around it.`,
    );
  }
  return view.length === 3 ? view[1] : undefined;
}

/**
 * The laws of the lens on the document with the block: a write of the
 * unchanged text gives no operations (GetPut, through all stages), and a
 * change of the paragraph before the block changes only that paragraph
 * (retention).
 */
function assertWrites(
  document: BlockNoteEditor<any, any, any>,
  paragraphId: string,
  text: string,
  { name, format }: NamedFormat,
  example: PartialBlock<any, any, any>,
): void {
  // This text is not equal to the text of the document, and it gives the
  // same blocks. Thus the write runs all stages.
  const unchanged = computeOperations(document, {
    format,
    text: `\n${text}\n\n`,
  });
  if (unchanged.error !== undefined || unchanged.operations.length > 0) {
    throw contractError(
      2,
      example,
      name,
      `a write of the unchanged text changes the document (${unchanged.error ?? JSON.stringify(unchanged.operations)}).`,
    );
  }
  const edited = computeOperations(document, {
    format,
    text: text.replace("Paragraph before", "Changed paragraph before"),
  });
  const [operation] = edited.error === undefined ? edited.operations : [];
  if (
    edited.error !== undefined ||
    edited.operations.length !== 1 ||
    operation.type !== "update" ||
    operation.id !== paragraphId
  ) {
    throw contractError(
      2,
      example,
      name,
      `a change of the paragraph before the block gives other operations than one update of that paragraph (${edited.error ?? JSON.stringify(edited.operations)}).`,
    );
  }
}

/**
 * Rule 4: the block reads back with the same type. Returns the data of the
 * block that does not read back: the names of the props with a different
 * value, and `"content"` for different content.
 */
function hiddenDataOf(
  back: LensBlock,
  block: LensBlock,
  example: PartialBlock<any, any, any>,
  format: string,
): string[] {
  if (back.type !== block.type) {
    throw contractError(
      4,
      example,
      format,
      `the block reads back as the type "${back.type}". Give the block type a \`parse\` that reads its export back as the same type (with \`runsBefore\`, if a default block type also reads that element). Else the type is data that the format does not show: a client that replaces the block with other text keeps the custom type.`,
    );
  }
  const props = Object.keys(block.props).filter(
    (name) =>
      JSON.stringify(block.props[name]) !== JSON.stringify(back.props[name]),
  );
  const sameContent =
    JSON.stringify(block.content) === JSON.stringify(back.content);
  return sameContent ? props : [...props, "content"];
}

/** An editor without a view, with the schema of `editor`, and the blocks (with new IDs) as its document. */
function editorWith(
  editor: BlockNoteEditor<any, any, any>,
  blocks: readonly PartialBlock<any, any, any>[],
): BlockNoteEditor<any, any, any> {
  return BlockNoteEditor.create({
    schema: editor.schema,
    initialContent: blocks.map(({ id: _id, ...block }) => block),
    trailingBlock: false,
  });
}

/** The text of a block with inline content, or the empty text. */
function textOf(block: LensBlock): string {
  return Array.isArray(block.content)
    ? block.content
        .map((item) =>
          "text" in item && typeof item.text === "string" ? item.text : "",
        )
        .join("")
    : "";
}

function contractError(
  rule: number,
  example: PartialBlock<any, any, any>,
  format: string,
  message: string,
): Error {
  return new Error(
    `Contract for block authors, rule ${rule} (block type "${String(example.type)}", ${format}): ${message}`,
  );
}
