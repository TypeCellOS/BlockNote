import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { DRAG_HANDLE_SELECTOR } from "../../utils/const.js";
import { sleep, waitForSelector } from "../../utils/editor.js";
import { getRect, mouseSequence } from "../../utils/mouse.js";

// Two editors stacked on the same grid cell (#2559), e.g. an editor in a
// dialog over another one. The top editor is editable; the bottom one is
// read-only or editable. The side menu and drops must go to the top editor.

const editors: Record<string, BlockNoteEditor<any, any, any>> = {};

function Editor(props: { name: string; ids: string[]; editable: boolean }) {
  const editor = useCreateBlockNote({
    initialContent: props.ids.map(
      (id) =>
        ({
          id,
          type: "paragraph",
          content: `${props.name} ${id}`,
        }) as PartialBlock,
    ),
  });
  editors[props.name] = editor;
  return <BlockNoteView editor={editor} editable={props.editable} />;
}

function Overlapping(props: { bottomEditable: boolean }) {
  return (
    <div style={{ display: "grid", width: 600 }}>
      <div style={{ gridArea: "1 / 1" }} data-editor-name="bottom">
        <Editor
          name="bottom"
          ids={["u1", "u2", "u3"]}
          editable={props.bottomEditable}
        />
      </div>
      <div
        style={{ gridArea: "1 / 1", zIndex: 1, background: "white" }}
        data-editor-name="top"
      >
        <Editor name="top" ids={["t1", "t2", "t3"]} editable={true} />
      </div>
    </div>
  );
}

afterEach(async () => {
  await mouseSequence([{ type: "move", x: 1, y: 1 }]);
  await cleanup();
});

function menuBlock(name: string): string | undefined {
  const state = editors[name].getExtension(SideMenuExtension)?.store.state;
  return state?.show ? state.block.id : undefined;
}

function blockRect(name: string, id: string) {
  return document
    .querySelector(
      `[data-editor-name="${name}"] .bn-block[data-id="${id}"] .bn-block-content`,
    )!
    .getBoundingClientRect();
}

for (const bottomEditable of [false, true]) {
  describe(`overlapping editors, bottom editor ${bottomEditable ? "editable" : "read-only"}`, () => {
    test("hover: the top editor shows its menu", async () => {
      await render(<Overlapping bottomEditable={bottomEditable} />);
      await waitForSelector(".bn-editor");
      const r = blockRect("top", "t2");
      await mouseSequence([
        { type: "move", x: r.x + 30, y: r.y + r.height / 2, steps: 8 },
      ]);
      await sleep(150);
      expect(menuBlock("top")).toBe("t2");
      expect(menuBlock("bottom")).toBeUndefined();
    });

    test("drag and drop: a block of the top editor moves within it", async () => {
      await render(<Overlapping bottomEditable={bottomEditable} />);
      await waitForSelector(".bn-editor");
      const r3 = blockRect("top", "t3");
      await mouseSequence([
        { type: "move", x: r3.x + 30, y: r3.y + r3.height / 2, steps: 8 },
      ]);
      await sleep(150);
      const handle = getRect(await waitForSelector(DRAG_HANDLE_SELECTOR));
      const t1 = blockRect("top", "t1");
      await mouseSequence([
        {
          type: "move",
          x: handle.x + handle.width / 2,
          y: handle.y + handle.height / 2,
          steps: 5,
        },
      ]);
      await mouseSequence([{ type: "down" }]);
      await sleep(100);
      await mouseSequence([
        { type: "move", x: t1.x + 30, y: t1.y + 2, steps: 5 },
      ]);
      await sleep(100);
      await mouseSequence([{ type: "up" }]);
      await sleep(150);
      expect(editors.top.document.map((b) => b.id)).toEqual(["t3", "t1", "t2"]);
      expect(editors.bottom.document.map((b) => b.id)).toEqual([
        "u1",
        "u2",
        "u3",
      ]);
    });
  });
}
