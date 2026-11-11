import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { replaySteps } from "./replayAnimation.js";

function docOf(texts: string[]) {
  return BlockNoteEditor.create({
    initialContent: texts.map((content) => ({ type: "paragraph", content })),
    trailingBlock: false,
  }).prosemirrorState.doc;
}

describe("the parts of the replay animation", () => {
  it("has one part for each word of new text, in sequence", () => {
    // One part for the full text is not correct in a browser: an element
    // on more than one line is clipped to the box of its first line, thus
    // the text on the next lines does not show during the animation.
    const doc = docOf(["First second third."]);

    const steps = replaySteps(doc, (node) => node.isText);

    expect(steps.map((step) => doc.textBetween(step.from, step.to))).toEqual([
      "First ",
      "second ",
      "third.",
    ]);
    expect(steps.every((step) => !step.block)).toBe(true);
    // Each part starts at the end of the part before it.
    let end = 0;
    for (const step of steps) {
      expect(step.delay).toBeCloseTo(end);
      end = step.delay + step.duration;
    }
    // The full text has the time of its characters (12 ms each).
    expect(end).toBeCloseTo("First second third.".length * 12);
  });

  it("shows a new block as a whole, and continues after it", () => {
    const doc = docOf(["One two", "Three"]);
    let blocks = 0;

    const steps = replaySteps(
      doc,
      // The first block container is new, and the text of the second block.
      (node) =>
        (node.type.name === "blockContainer" && blocks++ === 0) ||
        node.text === "Three",
    );

    expect(
      steps.map((step) => [
        step.block,
        doc.textBetween(step.from, step.to),
        step.delay,
      ]),
    ).toEqual([
      [true, "One two", 0],
      [false, "Three", 300],
    ]);
  });
});
