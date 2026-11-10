// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "vite-plus/test";

import { alignBlocks } from "../alignment/alignBlocks.js";
import type { FlatBlock } from "../model.js";

/**
 * Benchmarks for `alignBlocks` with real text: the time, and the quality (the
 * number of correct pairs). The normal test run does not run them. Run them
 * from packages/xl-ai with:
 *
 *   vp test bench --run --silent=false src/api/v2/benchmarks/alignment.bench.ts
 *
 * The text is the words of the docs (`docs/content`, about 50,000 words).
 * For larger documents, set TEXT_LENS_BENCH_CORPUS to a file of more text
 * (words with spaces between them), and TEXT_LENS_BENCH_SIZES to the sizes,
 * for example "1000x100,4000x100" (blocks x words in a block).
 */

const RUNS = 3;

/** The words of the docs, without code blocks, or of the file in TEXT_LENS_BENCH_CORPUS. */
function corpus(): string[] {
  const file = process.env.TEXT_LENS_BENCH_CORPUS;
  if (file) {
    return readFileSync(file, "utf8").split(/\s+/).filter(Boolean);
  }
  const docs = new URL("../../../../../../docs/content/", import.meta.url);
  return readdirSync(docs, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".mdx"))
    .sort()
    .flatMap((path) =>
      readFileSync(new URL(path, docs), "utf8")
        .replace(/```[\s\S]*?```/g, " ")
        .split(/\s+/)
        .filter(Boolean),
    );
}

const WORDS = corpus();
const SIZES = (process.env.TEXT_LENS_BENCH_SIZES ?? "200x100,1000x20")
  .split(",")
  .map((size) => size.split("x").map(Number));

/** A random number generator with a seed. Thus, each run has the same input. */
let seed = 7;
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

/** `count` paragraphs of about `size` words each: consecutive text of the corpus, from `start`. */
function paragraphs(start: number, count: number, size: number) {
  const texts: string[] = [];
  let at = start;
  for (let i = 0; i < count; i++) {
    const length = Math.max(5, Math.round(size * (0.5 + random())));
    texts.push(WORDS.slice(at, at + length).join(" "));
    at += length;
  }
  return { texts, end: at };
}

/** `count` consecutive words from a random place in the last fifth of the corpus. */
function otherWords(count: number) {
  const from = Math.floor(WORDS.length * 0.8);
  const at = from + Math.floor(random() * (WORDS.length - from - count));
  return WORDS.slice(at, at + count).join(" ");
}

/** The text with each word replaced by another word, with the probability `share`. */
function changeWords(text: string, share: number) {
  return text
    .split(" ")
    .map((word) => (random() < share ? otherWords(1) : word))
    .join(" ");
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

/** The median time of `RUNS` runs, after one run to warm up, in milliseconds. */
function median(run: () => unknown): number {
  run();
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  return Math.round(times.sort((x, y) => x - y)[RUNS >> 1]);
}

type Scenario = {
  name: string;
  texts: string[];
  /** The correct pairs: [index in the old list, index in the new list]. */
  correct: [number, number][];
};

function scenarios(
  old: string[],
  rewriteStart: number,
  size: number,
): Scenario[] {
  const same = old.map((_, i): [number, number] => [i, i]);
  const shuffled = old.map((_, i) => i).sort(() => random() - 0.5);
  const fewMoved = old.map((_, i) => i);
  for (let k = 0; k < 10; k++) {
    const [moved] = fewMoved.splice(Math.floor(random() * old.length), 1);
    fewMoved.splice(Math.floor(random() * old.length), 0, moved);
  }
  const kept = old.filter((_, i) => i % 2 === 0);
  return [
    {
      name: "one block: 10% of the words changed",
      texts: old.map((t, i) =>
        i === old.length >> 1 ? changeWords(t, 0.1) : t,
      ),
      correct: same,
    },
    {
      name: "each block: 10% of the words changed",
      texts: old.map((t) => changeWords(t, 0.1)),
      correct: same,
    },
    {
      name: "each block: 30% of the words changed",
      texts: old.map((t) => changeWords(t, 0.3)),
      correct: same,
    },
    {
      name: "each block: a sentence added",
      texts: old.map((t) => `${t} ${otherWords(15)}`),
      correct: same,
    },
    {
      name: "10 blocks moved",
      texts: fewMoved.map((i) => old[i]),
      correct: fewMoved.map((i, j) => [i, j]),
    },
    {
      name: "all blocks in a random order",
      texts: shuffled.map((i) => old[i]),
      correct: shuffled.map((i, j) => [i, j]),
    },
    {
      name: "half of the blocks removed",
      texts: kept,
      correct: kept.map((_, j) => [2 * j, j]),
    },
    {
      name: "full rewrite (other text)",
      texts: paragraphs(rewriteStart, old.length, size).texts,
      correct: [],
    },
  ];
}

describe("alignBlocks with real text", () => {
  it("measures the time and the quality of each scenario", () => {
    const rows: Record<string, string | number>[] = [];
    for (const [count, size] of SIZES) {
      seed = 7;
      const { texts: old, end } = paragraphs(0, count, size);
      const a = flat(old);
      for (const scenario of scenarios(old, end, size)) {
        const b = flat(scenario.texts);
        let pairs = alignBlocks(a, b);
        const ms = median(() => (pairs = alignBlocks(a, b)));
        const correct = new Set(scenario.correct.map(([x, y]) => `${x}:${y}`));
        const right = pairs.filter((pair) =>
          correct.has(`${pair.aIndex}:${pair.bIndex}`),
        ).length;
        rows.push({
          blocks: `${count} x ~${size} words`,
          scenario: scenario.name,
          ms,
          "correct pairs": `${right} of ${correct.size}`,
          "other pairs": pairs.length - right,
        });
      }
    }
    // oxlint-disable-next-line no-console -- The result of a benchmark.
    console.table(rows);
  }, 3_600_000);
});
