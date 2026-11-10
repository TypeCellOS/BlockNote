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
  it("is fast, because the gaps share one work limit", () => {
    // Unique anchor words, and between them one changed word of 3,000
    // random letters on each side. Before the shared limit, each gap used
    // the full work limit of a Myers diff: about 7 s for 60 gaps.
    const random = generator(3);
    const letters = (count: number) =>
      Array.from(
        { length: count },
        () => "abcdefghij"[Math.floor(random() * 10)],
      ).join("");
    const text = () =>
      Array.from({ length: 60 }, (_, i) => `anchor${i}x ${letters(3000)}`).join(
        " ",
      );
    const a = text();
    const b = text();

    const start = performance.now();
    const pairs = alignText(units(a), units(b));
    expect(performance.now() - start).toBeLessThan(3000);
    // Each anchor word matches.
    for (let i = 0; i < 60; i++) {
      const at = a.indexOf(`anchor${i}x`);
      expect(pairs.some((pair) => pair.aIndex === at)).toBe(true);
    }
  });
});
