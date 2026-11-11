// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { alignText, charKind, type TextUnit } from "./text.js";

/** A random number generator with a seed. Thus, each run has the same input. */
function generator(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function units(text: string): TextUnit[] {
  return Array.from(text, (char) => ({ key: char, kind: charKind(char) }));
}

describe("alignText: many large changed gaps", () => {
  it("takes a time that does not grow with each gap, because the gaps share one work limit", () => {
    // Unique anchor words, and between them one changed word of 3,000
    // random letters on each side. Before the shared limit, each gap used
    // the full work limit of a Myers diff: 60 gaps took about ten times as
    // long as 6 gaps (7 s and 0.7 s). Now the two take about the same time.
    // A ratio, not a time: a coverage run makes all code slower. The
    // smallest of three times: other tests that run at the same time can
    // make one run slower.
    const random = generator(3);
    const letters = (count: number) =>
      Array.from(
        { length: count },
        () => "abcdefghij"[Math.floor(random() * 10)],
      ).join("");
    const texts = (gaps: number) =>
      [0, 1].map(() =>
        units(
          Array.from(
            { length: gaps },
            (_, i) => `anchor${i}x ${letters(3000)}`,
          ).join(" "),
        ),
      );
    function time(gaps: number) {
      const [a, b] = texts(gaps);
      const times: number[] = [];
      for (let run = 0; run < 3; run++) {
        const start = performance.now();
        alignText(a, b);
        times.push(performance.now() - start);
      }
      return Math.min(...times);
    }

    time(6);
    expect(time(60)).toBeLessThan(5 * time(6));
    // The work is large on purpose: give it time when other tests run.
  }, 60_000);

  it("matches each anchor word between the large changed gaps", () => {
    const random = generator(5);
    const letters = (count: number) =>
      Array.from(
        { length: count },
        () => "abcdefghij"[Math.floor(random() * 10)],
      ).join("");
    const text = () =>
      Array.from({ length: 20 }, (_, i) => `anchor${i}x ${letters(3000)}`).join(
        " ",
      );
    const a = text();
    const pairs = alignText(units(a), units(text()));
    for (let i = 0; i < 20; i++) {
      const at = a.indexOf(`anchor${i}x`);
      expect(pairs.some((pair) => pair.aIndex === at)).toBe(true);
    }
  });
});
