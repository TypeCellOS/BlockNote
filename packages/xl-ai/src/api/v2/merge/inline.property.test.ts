// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensInlineContent, LensStyles } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { inlineContentToText } from "../util/blocks/text.js";
import { mergeInlineContent } from "./inline.js";
import { fromUnits, toUnits } from "./inlineUnits.js";

const WORDS = ["one", "two", "three", "four", "x", "😀", "é", "ab"];

function randomStyles(random: Random): LensStyles {
  const styles: LensStyles = {};
  if (random.chance(0.3)) {
    styles.bold = true;
  }
  if (random.chance(0.2)) {
    styles.italic = true;
  }
  if (random.chance(0.2)) {
    styles.textColor = random.pick(["red", "blue"]);
  }
  return styles;
}

/** Random inline content: styled text, links and mentions. */
function randomContent(random: Random): LensInlineContent[] {
  return Array.from({ length: random.int(5) }, (): LensInlineContent => {
    const text =
      Array.from({ length: 1 + random.int(3) }, () => random.pick(WORDS)).join(
        " ",
      ) + random.pick(["", " "]);
    const kind = random.int(10);
    if (kind === 0) {
      return { type: "mention", props: { user: random.pick(["Ann", "Bob"]) } };
    }
    if (kind === 1) {
      return {
        type: "link",
        href: random.pick(["https://a.example", "https://b.example"]),
        content: [{ type: "text", text, styles: randomStyles(random) }],
      };
    }
    return { type: "text", text, styles: randomStyles(random) };
  });
}

/** The content as one unit list: a canonical form to compare. */
function canonical(content: readonly LensInlineContent[]) {
  return fromUnits(toUnits(content));
}

describe("toUnits and fromUnits: properties", () => {
  it("gives a canonical form: a second round trip does not change it", () => {
    const random = createRandom(81);
    for (let run = 0; run < 300; run++) {
      const content = randomContent(random);
      const once = canonical(content);
      expect(canonical(once)).toEqual(once);
      expect(inlineContentToText(once)).toBe(inlineContentToText(content));
      expect(toUnits(once)).toEqual(toUnits(content));
    }
  });

  it("gives no empty text items and no two adjacent text items with equal styles", () => {
    const random = createRandom(82);
    for (let run = 0; run < 300; run++) {
      const content = canonical(randomContent(random));
      content.forEach((item, i) => {
        if (item.type === "text") {
          expect((item as { text: string }).text).not.toBe("");
          const next = content[i + 1];
          if (next?.type === "text") {
            expect((next as { styles: LensStyles }).styles).not.toEqual(
              (item as { styles: LensStyles }).styles,
            );
          }
        }
      });
    }
  });
});

describe("mergeInlineContent: laws on random content", () => {
  for (const concurrent of [false, true]) {
    const mode = concurrent ? "document merge" : "target stage";

    it(`gives theirs if ours did not change (${mode})`, () => {
      const random = createRandom(concurrent ? 83 : 84);
      for (let run = 0; run < 200; run++) {
        const base = randomContent(random);
        const theirs = randomContent(random);
        expect(
          canonical(mergeInlineContent(base, base, theirs, { concurrent })),
        ).toEqual(canonical(theirs));
      }
    });

    it(`gives ours if theirs did not change (${mode})`, () => {
      const random = createRandom(concurrent ? 85 : 86);
      for (let run = 0; run < 200; run++) {
        const base = randomContent(random);
        const ours = randomContent(random);
        expect(
          canonical(mergeInlineContent(base, ours, base, { concurrent })),
        ).toEqual(canonical(ours));
      }
    });

    it(`gives the change one time if the two sides made the same change (${mode})`, () => {
      const random = createRandom(concurrent ? 87 : 88);
      for (let run = 0; run < 200; run++) {
        const base = randomContent(random);
        const changed = randomContent(random);
        let conflicts = 0;
        const result = mergeInlineContent(base, changed, changed, {
          concurrent,
          onConflict: () => conflicts++,
        });
        expect(canonical(result)).toEqual(canonical(changed));
        expect(conflicts).toBe(0);
      }
    });
  }

  it("keeps the changes of two writers to different words of a paragraph (document merge)", () => {
    const random = createRandom(89);
    for (let run = 0; run < 200; run++) {
      const words = Array.from(
        { length: 5 + random.int(6) },
        (_, i) => `word${i}`,
      );
      const i = random.int(words.length);
      let j = random.int(words.length);
      while (Math.abs(i - j) < 2) {
        j = random.int(words.length);
      }
      const text = (list: string[]) => [
        { type: "text" as const, text: list.join(" "), styles: {} },
      ];
      const ours = words.map((word, k) => (k === i ? "OURS" : word));
      const theirs = words.map((word, k) => (k === j ? "THEIRS" : word));
      const both = words.map((word, k) =>
        k === i ? "OURS" : k === j ? "THEIRS" : word,
      );
      let conflicts = 0;
      const result = mergeInlineContent(text(words), text(ours), text(theirs), {
        concurrent: true,
        onConflict: () => conflicts++,
      });
      expect(inlineContentToText(result)).toBe(both.join(" "));
      expect(conflicts).toBe(0);
    }
  });
});
