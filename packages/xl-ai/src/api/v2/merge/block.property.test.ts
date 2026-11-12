// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { BlockFields, ContentKind, LensBlockContent } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { deepEqual } from "../util/blocks/json.js";
import { mergeBlock } from "./block.js";
import { allMergeRules } from "../testUtil/merge.js";

const KINDS: Record<string, ContentKind> = {
  paragraph: "inline",
  heading: "inline",
  codeBlock: "plain",
  image: "none",
  table: "table",
};
const contentKindOf = (type: string) => KINDS[type] ?? "inline";

function randomContent(random: Random, kind: ContentKind): LensBlockContent {
  const text = random.pick(["one two", "three", "x y z", ""]);
  const inline = (styles: Record<string, boolean>) =>
    text === "" ? [] : [{ type: "text" as const, text, styles }];
  switch (kind) {
    case "none":
      return undefined;
    case "plain":
      return inline({});
    case "inline":
      return inline(random.chance(0.3) ? { bold: true } : {});
    case "table":
      return {
        type: "tableContent",
        columnWidths: [undefined],
        // The stored form: cells in the `tableCell` form.
        rows: [
          {
            cells: [
              {
                type: "tableCell",
                props: {
                  colspan: 1,
                  rowspan: 1,
                  backgroundColor: random.pick(["default", "red"]),
                  textColor: "default",
                  textAlignment: "left",
                },
                content: inline({}),
              },
            ],
          },
        ],
      };
  }
}

function randomProps(random: Random, type: string): Record<string, unknown> {
  const props: Record<string, unknown> = {
    textColor: random.pick(["default", "red"]),
  };
  if (type === "heading") {
    props.level = random.pick([1, 2]);
  }
  if (type === "image") {
    props.url = random.pick(["a.png", "b.png"]);
  }
  return props;
}

function randomBlock(random: Random): BlockFields {
  const type = random.pick(Object.keys(KINDS));
  return {
    type,
    props: randomProps(random, type),
    content: randomContent(random, contentKindOf(type)),
  };
}

/** A random change of the type, the props or the content. */
function edit(random: Random, block: BlockFields): BlockFields {
  switch (random.int(4)) {
    case 0:
      return randomBlock(random);
    case 1:
      return { ...block, props: randomProps(random, block.type) };
    case 2:
      return {
        ...block,
        content: randomContent(random, contentKindOf(block.type)),
      };
    default:
      return block;
  }
}

describe("mergeBlock: laws on random blocks", () => {
  for (const [k, { name, rules }] of allMergeRules().entries()) {
    it(`gives theirs if ours did not change (${name})`, () => {
      const random = createRandom(131 + 1000 * k);
      for (let run = 0; run < 300; run++) {
        const base = randomBlock(random);
        const theirs = edit(random, base);
        const result = mergeBlock(base, base, theirs, contentKindOf, rules());
        expect({ run, result }).toEqual({ run, result: theirs });
      }
    });

    it(`gives ours if theirs did not change (${name})`, () => {
      const random = createRandom(133 + 1000 * k);
      for (let run = 0; run < 300; run++) {
        const base = randomBlock(random);
        const ours = edit(random, base);
        const result = mergeBlock(base, ours, base, contentKindOf, rules());
        expect({ run, result }).toEqual({ run, result: ours });
      }
    });

    it(`gives the change one time, without a conflict, if the two sides made the same change (${name})`, () => {
      const random = createRandom(135 + 1000 * k);
      for (let run = 0; run < 300; run++) {
        const base = randomBlock(random);
        const changed = edit(random, base);
        let conflicts = 0;
        const result = mergeBlock(
          base,
          changed,
          changed,
          contentKindOf,
          rules(() => conflicts++),
        );
        expect({ run, result }).toEqual({ run, result: changed });
        expect(conflicts).toBe(0);
      }
    });
  }

  it("gives a result type that can hold the result content", () => {
    const random = createRandom(137);
    const shapeOf = (content: LensBlockContent) =>
      Array.isArray(content)
        ? "text"
        : content === undefined
          ? "none"
          : "table";
    const shapeOfKind = {
      inline: "text",
      plain: "text",
      table: "table",
      none: "none",
    };
    for (let run = 0; run < 500; run++) {
      const base = randomBlock(random);
      const ours = edit(random, base);
      const theirs = edit(random, base);
      for (const { name, rules } of allMergeRules()) {
        const result = mergeBlock(base, ours, theirs, contentKindOf, rules());
        expect({ run, name, shape: shapeOf(result.content) }).toEqual({
          run,
          name,
          shape: shapeOfKind[contentKindOf(result.type)],
        });
        if (deepEqual(ours, theirs)) {
          expect(result).toEqual(ours);
        }
      }
    }
  });
});
