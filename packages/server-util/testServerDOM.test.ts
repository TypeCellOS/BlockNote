import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { createElement } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { ServerBlockNoteEditor } from "./src/context/ServerBlockNoteEditor.js";
import { useReactServerDOM } from "./testServerDOM.js";

describe("server DOM scheduler ownership", () => {
  const keys = ["window", "document", "IS_REACT_ACT_ENVIRONMENT"] as const;
  const previous = keys.map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  let restoreClock: (() => void) | undefined;

  beforeAll(() => {
    // Make each scheduler callback exhaust its time budget without sleeping.
    // Teardown must not depend on all callbacks fitting in one event-loop turn.
    let time = performance.now();
    const clock = vi
      .spyOn(performance, "now")
      .mockImplementation(() => (time += 10));
    restoreClock = () => clock.mockRestore();
  });
  afterAll(() => {
    restoreClock?.();
    expect(
      keys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key)),
    ).toEqual(previous);
  });

  describe("adapter integration", () => {
    useReactServerDOM();

    it("exports while React's scheduler must yield between callbacks", async () => {
      const paragraph = createReactBlockSpec(
        { type: "reactParagraph", propSchema: {}, content: "inline" },
        {
          render(props) {
            return createElement("p", { ref: props.contentRef });
          },
        },
      );
      const editor = ServerBlockNoteEditor.create({
        schema: BlockNoteSchema.create({
          blockSpecs: { ...defaultBlockSpecs, reactParagraph: paragraph() },
        }),
      });
      for (let index = 0; index < 10; index++) {
        expect(
          await editor.blocksToFullHTML([
            { type: "reactParagraph", content: `Paragraph ${index}` },
          ]),
        ).toContain(`Paragraph ${index}`);
      }
    });
  });
});
