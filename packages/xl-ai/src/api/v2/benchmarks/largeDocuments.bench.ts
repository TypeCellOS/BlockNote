import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc } from "@blocknote/core/yjs";
import { describe, it } from "vite-plus/test";
import * as Y from "yjs";

import { alignBlocks } from "../alignment/alignBlocks.js";
import { flattenBlocks } from "../blocks/flatten.js";
import type { LensBlock } from "../blocks/types.js";
import {
  computeTextUpdate,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
} from "../index.js";
import { diffDocuments } from "../operations/diffDocuments.js";
import { projectDocument } from "../projection/projectDocument.js";
import { planTarget } from "../plan/planTarget.js";
import { richDocument } from "../testUtil/fixtures.js";
import { bindEditor, unbindEditor } from "../testUtil/yjs.js";
import { updateYDocFromText } from "../yjs/index.js";

/**
 * Benchmarks for large documents. The normal test run does not run them. Run
 * them from packages/xl-ai with:
 *
 *   vp test bench --run --silent=false src/api/v2/benchmarks
 *
 * Set TEXT_LENS_BENCH_SIZES (for example "1000,5000") for other sizes, and
 * TEXT_LENS_BENCH_FORMATS (for example "markdown,plain text") for some
 * formats only. The result is a table of the median times in milliseconds.
 */

const RUNS = 3;
const SIZES = (process.env.TEXT_LENS_BENCH_SIZES ?? "1000,5000,10000")
  .split(",")
  .map(Number);

/** A document with about `size` blocks: copies of the rich test document, with unique IDs and texts. */
function largeDocument(size: number): PartialBlock[] {
  const count = (blocks: PartialBlock[]): number =>
    blocks.reduce((sum, block) => sum + 1 + count(block.children ?? []), 0);
  const copies = Math.ceil(size / count(richDocument));
  const blocks: PartialBlock[] = [];
  for (let copy = 0; copy < copies; copy++) {
    for (const block of richDocument) {
      blocks.push(
        JSON.parse(
          JSON.stringify(block)
            .replace(/"id":"([^"]+)"/g, `"id":"$1-${copy}"`)
            .replace(/"text":"([^"]+)"/g, `"text":"$1 ${copy}"`),
        ),
      );
    }
  }
  return blocks;
}

/** Lets the event loop turn. Thus, jsdom frees the memory of earlier renders (see the README). */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The median time of `RUNS` runs of `run`, in milliseconds. `prepare` gives
 * the input of each run. Its time does not count.
 */
async function median<T>(
  run: (input: T) => unknown,
  prepare: () => T = () => undefined as T,
  finish: (input: T) => void = () => {},
): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const input = prepare();
    await tick();
    const start = performance.now();
    run(input);
    times.push(performance.now() - start);
    finish(input);
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(times.length / 2)]);
}

const selectedFormats = process.env.TEXT_LENS_BENCH_FORMATS?.split(",");
const formats = (
  [
    ["markdown", markdownFormat],
    ["HTML", htmlFormat],
    ["plain text", plainTextFormat],
  ] satisfies [string, TextFormat][]
).filter(([name]) => selectedFormats?.includes(name) ?? true);

describe("large documents", () => {
  it(
    "measures the API and each stage of the pipeline",
    async () => {
      const rows: Record<string, string | number>[] = [];
      for (const size of SIZES) {
        const editor: BlockNoteEditor<any, any, any> = BlockNoteEditor.create({
          initialContent: largeDocument(size),
        });
        const document: LensBlock[] = editor.document;
        const blocks = flattenBlocks(document).length;
        for (const [name, format] of formats) {
          const text = getDocumentText(editor, format);
          // One changed block in the middle of the document.
          const middle = text.indexOf("Last paragraph", text.length / 2);
          const edited =
            text.slice(0, middle) + "Changed. " + text.slice(middle);

          // The stages of the pipeline (see api.ts).
          let projection = projectDocument(editor, format, document);
          let incoming = flattenBlocks(format.parse(editor, edited));
          let alignment = alignBlocks(projection.view, incoming);
          let plan = planTarget({
            document,
            projection,
            incoming,
            alignment,
            contentKindOf: (type) => editor.schema.blockSchema[type].content,
            newId: () => crypto.randomUUID(),
          });

          // A write from an older version: another writer changed the first block.
          const other = BlockNoteEditor.create({ initialContent: document });
          other.updateBlock(document[0].id, { props: { textColor: "blue" } });

          // The same document in a Y.Doc.
          const ydoc = blocksToYDoc(editor, editor.document);
          const reader = bindEditor(ydoc.getXmlFragment("prosemirror"));
          const yText = getDocumentText(reader, format);
          unbindEditor(reader);
          const yEdited =
            yText.slice(0, yText.indexOf("Last paragraph", yText.length / 2)) +
            "Changed. " +
            yText.slice(yText.indexOf("Last paragraph", yText.length / 2));

          rows.push({
            blocks,
            format: name,
            read: await median(() => getDocumentText(editor, format)),
            "write same text": await median(() =>
              computeTextUpdate(editor, {
                base: "current",
                format,
                text: `${text}\n`,
              }),
            ),
            "write one change": await median(() =>
              computeTextUpdate(editor, {
                base: "current",
                format,
                text: edited,
              }),
            ),
            "older base": await median(() =>
              computeTextUpdate(other, {
                format,
                text: edited,
                base: document,
              }),
            ),
            // A new client of a copy of the Y.Doc for each run. The bind is
            // not in the time.
            "Y.Doc write": await median(
              ({ client, fragment }) =>
                updateYDocFromText(client, fragment, {
                  format,
                  text: yEdited,
                  base: Y.encodeStateAsUpdate(ydoc),
                }),
              () => {
                const copy = new Y.Doc();
                Y.applyUpdate(copy, Y.encodeStateAsUpdate(ydoc));
                const fragment = copy.getXmlFragment("prosemirror");
                return { client: bindEditor(fragment), fragment };
              },
              // An editor of 10,000 blocks with a DOM is large in memory.
              ({ client }) => unbindEditor(client),
            ),
            "· project": await median(() => {
              projection = projectDocument(editor, format, document);
            }),
            "· parse text": await median(() => {
              incoming = flattenBlocks(format.parse(editor, edited));
            }),
            "· align": await median(() => {
              alignment = alignBlocks(projection.view, incoming);
            }),
            "· plan": await median(() => {
              plan = planTarget({
                document,
                projection,
                incoming,
                alignment,
                contentKindOf: (type) =>
                  editor.schema.blockSchema[type].content,
                newId: () => crypto.randomUUID(),
              });
            }),
            "· diff": await median(() => diffDocuments(document, plan.target)),
          });
        }
      }
      // oxlint-disable-next-line no-console
      console.table(rows);
    },
    30 * 60 * 1000,
  );
});
