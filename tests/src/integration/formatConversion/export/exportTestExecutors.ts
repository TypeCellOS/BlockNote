import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { prettify } from "htmlfy";
import { expect } from "vite-plus/test";

import { normalizeHTMLStyleAttribute } from "../../support/normalizeHTMLStyleAttribute.js";
import { prepareConversionBlocks } from "../prepareConversionBlocks.js";
import { ExportTestCase } from "./exportTestCase.js";

// Preserve `<code>` whitespace so code-block snapshots show actual newlines
// instead of having them collapsed by the prettifier.
const PRETTIFY_OPTIONS = { tag_wrap: true, ignore: ["code"] };

export const testExportBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
  normalizeHTML: (html: string) => string = (html) => html,
) => {
  const blocks = prepareConversionBlocks<B, I, S>(testCase.content);

  await expect(
    prettify(
      normalizeHTML(
        normalizeHTMLStyleAttribute(editor.blocksToFullHTML(blocks)),
      ),
      PRETTIFY_OPTIONS,
    ),
  ).toMatchFileSnapshot(`./__snapshots__/blocknoteHTML/${testCase.name}.html`);
};

export const testExportHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const blocks = prepareConversionBlocks<B, I, S>(testCase.content);

  await expect(
    prettify(
      normalizeHTMLStyleAttribute(editor.blocksToHTMLLossy(blocks)),
      PRETTIFY_OPTIONS,
    ),
  ).toMatchFileSnapshot(`./__snapshots__/html/${testCase.name}.html`);
};

export const testExportMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const blocks = prepareConversionBlocks<B, I, S>(testCase.content);

  await expect(editor.blocksToMarkdownLossy(blocks)).toMatchFileSnapshot(
    `./__snapshots__/markdown/${testCase.name}.md`,
  );
};

export const testExportNodes = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const blocks = prepareConversionBlocks<B, I, S>(testCase.content);

  await expect(
    blocks.map((block) =>
      blockToNode(block, editor.pmSchema, editor.schema.styleSchema),
    ),
  ).toMatchFileSnapshot(`./__snapshots__/nodes/${testCase.name}.json`);
};
