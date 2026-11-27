import { expect } from "vite-plus/test";
import { TableHandlesExtension } from "./TableHandles.js";

it.for(["ltr", "rtl"] as const)(
  "%s offers column extension beyond the table's inline end",
  async (direction, { setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [
        {
          id: "table",
          type: "table",
          content: { type: "tableContent", rows: [{ cells: ["A", "B", "C"] }] },
        },
      ],
    });
    const root = editor.domElement!;
    root.dir = direction;
    root
      .querySelectorAll("td")[2]
      .dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    const rect = root.querySelector("tbody")!.getBoundingClientRect();
    root.querySelector(".tableWrapper")!.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: direction === "rtl" ? rect.left - 5 : rect.right + 5,
        clientY: rect.top + rect.height / 2,
      }),
    );
    expect(
      editor.getExtension(TableHandlesExtension)!.store.state,
    ).toMatchObject({
      show: true,
      showAddOrRemoveColumnsButton: true,
      rowIndex: undefined,
      colIndex: undefined,
    });
  },
);
