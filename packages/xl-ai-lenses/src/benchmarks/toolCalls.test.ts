import { describe, it } from "vite-plus/test";

import { deriveSuggestions } from "../proposal/derive.js";
import { hashDocument } from "../proposal/hash.js";
import {
  createProposal,
  headlessEditorFactory,
  replayProposal,
} from "../proposal/proposal.js";
import type { Proposal } from "../proposal/types.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { documentOf } from "../testUtil.js";
import {
  editText,
  readDocument,
  writeDocument,
} from "../tools/documentTools.js";
import { createProposalDocument } from "../proposal/proposalDocument.js";

// The work of a host for one tool call, and the work of a client for one
// batch, for documents of different sizes. The times are for jsdom, as on
// a server. The normal test run skips this file. Run it with
//   DOCUMENT_AGENT_BENCH=1 vp test --run --silent=false src/benchmarks

const run = process.env.DOCUMENT_AGENT_BENCH === "1";
const createEditor = headlessEditorFactory();

const WORDS =
  "open source software lets people read change and share the code of the programs that they use each day".split(
    " ",
  );

/** A document of paragraphs with about 20 words each. Each paragraph has a different text. */
function documentWith(blocks: number) {
  return documentOf(
    Array.from({ length: blocks }, (_, index) => ({
      id: `block-${index}`,
      type: "paragraph" as const,
      content: `Paragraph ${index}: ${WORDS.map((_word, i) => WORDS[(i + index) % WORDS.length]).join(" ")}.`,
    })),
  );
}

/** The median time of some runs, in milliseconds. One run before them is not in the result. */
async function time(runs: number, step: () => unknown): Promise<number> {
  await step();
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    await step();
    times.push(performance.now() - started);
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(times.length / 2)] * 10) / 10;
}

describe.skipIf(!run)("the work for one tool call", () => {
  it(
    "measures documents of 20, 200 and 1000 blocks",
    { timeout: 600_000 },
    async () => {
      const rows: Record<string, unknown>[] = [];
      for (const blocks of [20, 200, 1000]) {
        const origin = documentWith(blocks);
        const store = createInMemoryProposalStore();
        const handle = createProposalDocument({
          store,
          proposalId: "p",
          createEditor,
        });
        /** A proposal of the document with some batches: one edit for each batch. */
        async function proposalWith(batches: number): Promise<Proposal> {
          await store.save("p", createProposal(origin));
          for (let i = 0; i < batches; i++) {
            await editText(
              handle,
              {
                old: `Paragraph ${i}:`,
                new: `Paragraph ${i} (edit):`,
                reason: "r",
              },
              `seed-${i}`,
            );
          }
          return (await store.load("p"))!;
        }
        const fresh = await proposalWith(0);
        const withTen = await proposalWith(10);
        const runs = blocks >= 1000 ? 5 : 9;

        // The host: one tool call on a proposal without batches.
        await store.save("p", fresh);
        const read = await time(runs, () => readDocument(handle));
        const { markdown, version } = await readDocument(handle);
        const edit = await time(runs, async () => {
          await store.save("p", fresh);
          return editText(
            handle,
            { old: "Paragraph 5:", new: "Paragraph five:", reason: "r" },
            "edit",
          );
        });
        const write = await time(runs, async () => {
          await store.save("p", fresh);
          return writeDocument(
            handle,
            {
              markdown: markdown.replace("Paragraph 7:", "Paragraph seven:"),
              base: version,
              reason: "r",
            },
            "write",
          );
        });
        // A tool call on a proposal that has 10 batches: the replay is longer.
        const editAfterTen = await time(runs, async () => {
          await store.save("p", withTen);
          return editText(
            handle,
            { old: "Paragraph 15:", new: "Paragraph fifteen:", reason: "r" },
            "late",
          );
        });

        // The client: the replay with the hash check, and the derived suggestions.
        const replay = await time(runs, () =>
          replayProposal(createEditor, withTen),
        );
        const main = createEditor(origin);
        const derive = await time(runs, () =>
          deriveSuggestions(main, createEditor, withTen),
        );
        const hash = await time(runs, () => hashDocument(origin));

        rows.push({
          blocks,
          "readDocument (ms)": read,
          "editText (ms)": edit,
          "writeDocument, 1 change (ms)": write,
          "editText after 10 batches (ms)": editAfterTen,
          "client replay, 10 batches (ms)": replay,
          "client derive, 10 batches (ms)": derive,
          "hash (ms)": hash,
          "batch JSON (bytes)": JSON.stringify(withTen.batches[0]).length,
        });
      }
      // eslint-disable-next-line no-console
      console.table(rows);
    },
  );
});
