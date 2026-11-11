import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BlockNoteEditor } from "@blocknote/core";
import { describe, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { flattenBlocks } from "../util/blocks/flatten.js";
import {
  computeOperations,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
} from "../index.js";
import { documentText, formatCache } from "../projection/cache.js";

/**
 * Measures the cache of the text and the projection (`projection/cache.ts`)
 * with real text: the docs (`docs/content`), parsed from markdown into
 * blocks (headings, lists, paragraphs, links). The normal test run does not
 * run it. Run it from packages/xl-ai with:
 *
 *   vp test bench --run --silent=false src/api/v2/benchmarks/cache.bench.ts
 *
 * For each write, the cache has one of three states:
 *
 * - "no cache": the cache is empty (as without the cache).
 * - "after a read": the cache has the text of the source (a read of the
 *   client from this editor), but no projection.
 * - "second write": the cache has the text and the projection (the client
 *   writes again from the same version).
 *
 * The result is a table of the median times in milliseconds.
 */

const RUNS = 5;

/**
 * The docs as markdown: without front matter, code blocks, imports and JSX
 * lines. A line-by-line filter, not a regex: the docs have fences of
 * different lengths.
 */
function docsMarkdown(): string {
  // A path, not a URL: in jsdom, `URL` is the class of jsdom.
  const docs = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../../docs/content",
  );
  return readdirSync(docs, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".mdx"))
    .sort()
    .map((path) => {
      let inFence = false;
      return readFileSync(join(docs, path), "utf8")
        .replace(/^---[\s\S]*?\n---/, "")
        .split("\n")
        .filter((line) => {
          if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            return false;
          }
          return !inFence && !/^\s*(<|import |export |\{)/.test(line);
        })
        .join("\n");
    })
    .join("\n\n");
}

/** The median time of `RUNS` runs of `run`, in milliseconds. `prepare` runs before each run. Its time does not count. */
function median(run: () => unknown, prepare: () => void): number {
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    prepare();
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(times.length / 2)]);
}

/** The text with "Changed. " before a paragraph in the middle. */
function changedText(text: string): string {
  const middle = text.indexOf("\n\n", text.length / 2) + 2;
  return text.slice(0, middle) + "Changed. " + text.slice(middle);
}

const formats: [string, TextFormat][] = [
  ["markdown", markdownFormat],
  ["HTML", htmlFormat],
  ["plain text", plainTextFormat],
];

describe("the cache of the text and the projection", () => {
  it(
    "measures a write in each state of the cache",
    () => {
      const reader = BlockNoteEditor.create();
      const all = reader.tryParseMarkdownToBlocks(docsMarkdown());
      const rows: Record<string, string | number>[] = [];
      for (const size of [500, all.length]) {
        const editor: BlockNoteEditor<any, any, any> = BlockNoteEditor.create({
          initialContent: all.slice(0, size),
        });
        const version: LensBlock[] = editor.document;
        for (const [name, format] of formats) {
          const cache = formatCache(editor, format);
          const read = getDocumentText(editor, format);
          const edited = changedText(read);
          const noCache = () => {
            cache.last = undefined;
          };
          const afterRead = (source: readonly LensBlock[]) => () => {
            cache.last = undefined;
            documentText(editor, format, source);
          };
          const write = () =>
            computeOperations(editor, {
              base: "current",
              format,
              text: edited,
            });
          rows.push({
            blocks: flattenBlocks(version).length,
            format: name,
            "text chars": read.length,
            "cache key (JSON)": median(
              () => JSON.stringify(editor.document),
              () => {},
            ),
            "write: no cache": median(write, noCache),
            "write: after a read": median(write, afterRead(version)),
            "write: second write": median(write, () => {}),
          });
        }
        // A write from a version: another writer changed the first block
        // after the read of the client.
        editor.updateBlock(version[0].id, { props: { textColor: "blue" } });
        for (const [name, format] of formats) {
          const cache = formatCache(editor, format);
          cache.last = undefined;
          const edited = changedText(
            documentText(editor, format, version).text,
          );
          const writeFromVersion = () =>
            computeOperations(editor, { base: version, format, text: edited });
          rows.push({
            blocks: flattenBlocks(version).length,
            format: `${name}, from a version`,
            "write: no cache": median(writeFromVersion, () => {
              cache.last = undefined;
            }),
            "write: after a read": median(writeFromVersion, () => {
              cache.last = undefined;
              documentText(editor, format, version);
            }),
            "write: second write": median(writeFromVersion, () => {}),
          });
        }
      }
      // oxlint-disable-next-line no-console
      console.table(rows);
    },
    30 * 60 * 1000,
  );
});
