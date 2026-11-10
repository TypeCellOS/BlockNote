// @vitest-environment node
import { describe, it } from "vite-plus/test";

import { alignBlocks } from "../alignment/alignBlocks.js";
import type { FlatBlock } from "../blocks/types.js";

/**
 * Benchmarks for `alignBlocks` on large lists of paragraphs, with changes
 * from small edits to full rewrites. The normal test run does not run them.
 * Run them from packages/xl-ai with:
 *
 *   vp test bench --run --silent=false src/api/v2/benchmarks/alignment.bench.ts
 *
 * The time is mostly the word diff (`textOverlaps`). Its Myers diff has a
 * limit of work for each gap between two anchors (see `anchoredMatch`). The
 * inputs "common words only" have no unique words, thus they give large gaps
 * without anchors: the worst case of this limit.
 */

const SIZES = [1000, 10000];
const RUNS = 5;

/** A random number generator with a seed. Thus, each run has the same input. */
function generator(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}
const random = generator(1);

const COMMON =
  "the a of and to in is it that for on with as was at by this be are from".split(
    " ",
  );
const RARE = Array.from({ length: 5000 }, (_, i) => `w${i.toString(36)}x`);

/** A text of 12 to 21 words. Half of the words are common words if `rare`. */
function paragraph(rare = true) {
  return Array.from({ length: 12 + Math.floor(random() * 10) }, () =>
    rare && random() < 0.5
      ? RARE[Math.floor(random() * RARE.length)]
      : COMMON[Math.floor(random() * COMMON.length)],
  ).join(" ");
}

function flat(texts: readonly string[]): FlatBlock[] {
  return texts.map((text) => ({
    block: {
      id: "",
      type: "paragraph",
      props: {},
      content: [{ type: "text", text, styles: {} }],
    },
    parentIndex: undefined,
  }));
}

/** The median time of `RUNS` runs, after two runs to warm up, in milliseconds. */
function median(run: () => unknown): number {
  run();
  run();
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  return Math.round(times.sort((x, y) => x - y)[RUNS >> 1]);
}

/** The changed texts for each scenario. */
function scenarios(base: readonly string[], rare: boolean) {
  const rewrite = (keepEach: number) =>
    base.map((text, i) => (i % keepEach === 0 ? text : paragraph(rare)));
  return {
    "one block edited": base.map((text, i) =>
      i === base.length >> 1 ? `${text} ${paragraph(rare)}` : text,
    ),
    "each block: one word changed": base.map((text) =>
      text.replace(/\S+$/, "changed"),
    ),
    "each block: a sentence added": base.map(
      (text) => `${text} ${paragraph(rare)}`,
    ),
    "full rewrite": rewrite(Number.MAX_SAFE_INTEGER),
    "rewrite, 1 block in 100 kept": rewrite(100),
    "rewrite, 1 block in 10 kept": rewrite(10),
    "all blocks in a random order": [...base].sort(() => random() - 0.5),
    "half of the blocks removed": base.filter((_, i) => i % 2 === 0),
  };
}

describe("alignBlocks on large lists", () => {
  it("measures each scenario", () => {
    const rows: Record<string, string | number>[] = [];
    for (const rare of [true, false]) {
      for (const size of SIZES) {
        const base = Array.from({ length: size }, () => paragraph(rare));
        const a = flat(base);
        for (const [name, texts] of Object.entries(scenarios(base, rare))) {
          const b = flat(texts);
          rows.push({
            words: rare ? "common and rare" : "common words only",
            blocks: size,
            scenario: name,
            ms: median(() => alignBlocks(a, b)),
          });
        }
      }
    }
    // oxlint-disable-next-line no-console -- The result of a benchmark.
    console.table(rows);
  }, 600_000);
});
