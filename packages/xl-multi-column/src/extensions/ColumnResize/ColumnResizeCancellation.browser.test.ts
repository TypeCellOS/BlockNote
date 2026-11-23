import { BlockNoteSchema } from "@blocknote/core";
import { expect } from "vite-plus/test";
import { commands } from "../../../../../tests/src/commands/transport.js";
import { withMultiColumn } from "../../blocks/schema.js";

const schema = withMultiColumn(BlockNoteSchema.create());

it("can resize another boundary after a column is removed during a drag", async ({
  setupEditor,
  onTestFinished,
}) => {
  const { editor } = await setupEditor({
    schema,
    initialContent: [
      {
        type: "columnList",
        children: ["a", "b", "c"].map((id) => ({
          id,
          type: "column" as const,
          children: [{ type: "paragraph" as const, content: id }],
        })),
      },
    ],
  });
  let pointerDown = false;
  onTestFinished(async () => {
    if (pointerDown) {
      await commands.positionalMouse({ type: "up" });
    }
  });

  function column(id: string) {
    return editor.domElement!.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
  }

  function boundaryPoint(id: string) {
    const rect = column(id).getBoundingClientRect();
    return { x: rect.right - 3, y: rect.top + rect.height / 2 };
  }

  function width(id: string) {
    const block = editor.getBlock(id);
    if (block?.type !== "column") {
      throw new Error(`Expected column ${id}`);
    }
    return block.props.width;
  }

  const first = boundaryPoint("a");
  pointerDown = true;
  await commands.positionalMouse(
    { type: "move", ...first },
    { type: "down" },
    { type: "move", x: first.x + 10, y: first.y },
  );
  expect(width("a")).toBeGreaterThan(1);

  editor.removeBlocks(["a"]);
  await commands.positionalMouse({ type: "up" });
  pointerDown = false;

  const second = boundaryPoint("b");
  await commands.positionalMouse({ type: "move", ...second });
  await expect
    .poll(() => column("b").classList.contains("bn-column-resize-border"))
    .toBe(true);

  const before = [width("b"), width("c")];
  pointerDown = true;
  await commands.positionalMouse(
    { type: "down" },
    { type: "move", x: second.x + 12, y: second.y },
    { type: "up" },
  );
  pointerDown = false;
  const after = [width("b"), width("c")];
  expect(after[0]).toBeGreaterThan(before[0]);
  expect(after[1]).toBeLessThan(before[1]);

  await commands.positionalMouse({
    type: "move",
    x: second.x + 24,
    y: second.y,
  });
  expect([width("b"), width("c")]).toEqual(after);
});
