// @vitest-environment node
import {
  BlockNoteEditor,
  getNodeById,
  inlineContentToNodes,
} from "@blocknote/core";
import { Fragment } from "prosemirror-model";
import { describe, expect, it } from "vite-plus/test";

import { fromUnits, toUnits } from "../merge/inlineUnits.js";
import type { LensInlineContent, LensStyles } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { addInlineContentSteps } from "./inlineSteps.js";

const WORDS = ["one", "two", "three", "x", "😀", "é", "ab", "a"];

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

/** Random inline content: styled text and links. */
function randomContent(random: Random): LensInlineContent[] {
  return Array.from({ length: random.int(5) }, (): LensInlineContent => {
    const text =
      Array.from({ length: 1 + random.int(3) }, () => random.pick(WORDS)).join(
        random.pick([" ", "  ", ", "]),
      ) + random.pick(["", " "]);
    if (random.chance(0.15)) {
      return {
        type: "link",
        href: random.pick(["https://a.example", "https://b.example"]),
        content: [{ type: "text", text, styles: randomStyles(random) }],
      };
    }
    return { type: "text", text, styles: randomStyles(random) };
  });
}

/** Applies the steps that change paragraph "p" to `content`. Returns the number of steps. */
function applySteps(
  editor: BlockNoteEditor<any, any, any>,
  content: LensInlineContent[],
): number {
  let count = 0;
  editor.transact((tr) => {
    const found = getNodeById("p", tr.doc)!;
    const blockContent = found.node.firstChild!;
    addInlineContentSteps(
      tr,
      found.posBeforeNode + 2,
      blockContent,
      Fragment.from(
        inlineContentToNodes<any, any>(
          content,
          editor.pmSchema,
          blockContent.type.name,
        ),
      ),
    );
    count = tr.steps.length;
  });
  return count;
}

/** The canonical form of inline content (see `fromUnits`). */
function canonical(content: readonly LensInlineContent[]) {
  return fromUnits(toUnits(content));
}

describe("addInlineContentSteps: properties", () => {
  it("changes the content of the block to the target content", () => {
    const random = createRandom(161);
    for (let run = 0; run < 100; run++) {
      const current = randomContent(random);
      const target = randomContent(random);
      const editor = BlockNoteEditor.create({
        initialContent: [
          { id: "p", type: "paragraph", content: current as any },
        ],
      });
      applySteps(editor, target);
      expect({
        run,
        content: canonical(editor.getBlock("p")!.content as any),
      }).toEqual({
        run,
        content: canonical(target),
      });
    }
  });

  it("makes no steps if the content does not change", () => {
    const random = createRandom(162);
    for (let run = 0; run < 100; run++) {
      const content = randomContent(random);
      const editor = BlockNoteEditor.create({
        initialContent: [
          { id: "p", type: "paragraph", content: content as any },
        ],
      });
      expect(applySteps(editor, editor.getBlock("p")!.content as any)).toBe(0);
    }
  });
});
