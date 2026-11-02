import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { addIdsToBlocks } from "@shared/formatConversionTestUtil.js";
import { prettify } from "htmlfy";
import { expect } from "vite-plus/test";

import { ExportTestCase } from "./exportTestCase.js";

// Preserve `<code>` whitespace so code-block snapshots show actual newlines
// instead of having them collapsed by the prettifier.
const PRETTIFY_OPTIONS = { tag_wrap: true, ignore: ["code"] };
const SERIALIZED_LIST_ID =
  /^bn-html-list-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-\d+$/;

// Serialization scopes intentionally differ between calls. Normalize only the
// generated ID/IDREF tokens for snapshots, retaining target identity and order.
// Duplicate targets and dangling references must fail rather than be hidden by
// normalization. Document IDs and all non-accessibility markup stay untouched.
function normalizeSerializedListIDs(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  const ids = new Map<string, string>();
  for (const element of container.querySelectorAll("[id]")) {
    const id = element.id;
    if (!SERIALIZED_LIST_ID.test(id)) {
      continue;
    }
    expect(ids.has(id), `Duplicate serialized list target: ${id}`).toBe(false);
    const normalized = `bn-html-list-item-${ids.size + 1}`;
    ids.set(id, normalized);
  }
  // Rewrite attributes in tags only, not text/code. Do not reserialize the
  // parsed DOM: that would introduce unrelated parser repairs such as tbody.
  return html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, (tag) =>
    tag.replace(
      /(\s(?:id|aria-owns)=")([^"]*)(")/g,
      (_attribute, prefix: string, value: string, suffix: string) =>
        prefix +
        value.replace(/\S+/g, (id) => {
          if (!SERIALIZED_LIST_ID.test(id)) {
            return id;
          }
          expect(ids.has(id), `Unresolved serialized list target: ${id}`).toBe(
            true,
          );
          return ids.get(id)!;
        }) +
        suffix,
    ),
  );
}

export const testExportBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  await expect(
    prettify(
      normalizeSerializedListIDs(editor.blocksToFullHTML(testCase.content)),
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
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  await expect(
    prettify(editor.blocksToHTMLLossy(testCase.content), PRETTIFY_OPTIONS),
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
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  await expect(
    editor.blocksToMarkdownLossy(testCase.content),
  ).toMatchFileSnapshot(`./__snapshots__/markdown/${testCase.name}.md`);
};

export const testExportNodes = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  await expect(
    testCase.content.map((block) =>
      blockToNode(block, editor.pmSchema, editor.schema.styleSchema),
    ),
  ).toMatchFileSnapshot(`./__snapshots__/nodes/${testCase.name}.json`);
};
