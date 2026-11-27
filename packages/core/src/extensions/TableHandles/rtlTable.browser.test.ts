import { expect } from "vite-plus/test";
import { TableHandlesExtension } from "./TableHandles.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";

const initialContent = [
  {
    id: "table",
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A", "B", "C"] }],
    },
  },
] satisfies PartialBlock[];

it.for(["ltr", "rtl"] as const)(
  "%s inserts columns on the requested physical side",
  async (dir, { setupEditor }) => {
    for (const side of ["left", "right"] as const) {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent,
      });
      const container = editor.domElement!;
      container.dir = dir;
      container
        .querySelector("td")!
        .dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
      const handles = editor.getExtension(TableHandlesExtension)!;
      handles.addRowOrColumn(1, { orientation: "column", side });
      const cells = [...container.querySelectorAll("td")];
      const added = cells.find((cell) => !cell.textContent)!;
      const middle = cells.find((cell) => cell.textContent === "B")!;
      expect(
        side === "left"
          ? added.getBoundingClientRect().right <=
              middle.getBoundingClientRect().left + 1
          : added.getBoundingClientRect().left >=
              middle.getBoundingClientRect().right - 1,
      ).toBe(true);
      expect(cells.map((cell) => cell.textContent).filter(Boolean)).toEqual([
        "A",
        "B",
        "C",
      ]);
    }
  },
);

it.for([
  ["ltr", 0, 2],
  ["rtl", 0, 2],
  ["rtl", 2, 0],
] as const)(
  "%s column reorder from %s to %s marks the target's inline edge",
  async ([dir, from, to], { setupEditor }) => {
    const { editor } = await setupEditor({ mountType: "dom", initialContent });
    const container = editor.domElement!;
    container.dir = dir;
    const handles = editor.getExtension(TableHandlesExtension)!;
    const cells = container.querySelectorAll("td");
    const start = cells[from].getBoundingClientRect();
    cells[from].dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    handles.colDragStart({
      dataTransfer: new DataTransfer(),
      clientX: start.x,
    });
    const target = cells[to].getBoundingClientRect();
    cells[to].dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        clientX: target.x + target.width / 2,
        clientY: target.y + target.height / 2,
        dataTransfer: new DataTransfer(),
      }),
    );
    const indicator = container.querySelector<HTMLElement>(
      ".bn-table-drop-cursor",
    )!;
    expect(indicator).not.toBeNull();
    const rect = indicator.getBoundingClientRect();
    const leftEdge = (dir === "rtl") === to > from;
    expect(
      Math.abs(
        (leftEdge ? rect.left : rect.right) -
          (leftEdge ? target.left : target.right),
      ),
    ).toBeLessThan(5);
  },
);
