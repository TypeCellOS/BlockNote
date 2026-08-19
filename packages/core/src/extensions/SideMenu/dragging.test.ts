import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { SideMenuExtension } from "./SideMenu.js";

/**
 * @vitest-environment jsdom
 */

const testDocument: PartialBlock[] = [
  { id: "paragraph-0", type: "paragraph", content: "First" },
  { id: "paragraph-1", type: "paragraph", content: "Second" },
];

let editor: BlockNoteEditor;
let themeWrapper: HTMLDivElement;
let mountPoint: HTMLDivElement;

beforeEach(() => {
  // Stands in for the app's own theming layer - the case from #1685, where the
  // block's styling comes from a custom property set above the editor.
  themeWrapper = document.createElement("div");
  themeWrapper.style.setProperty("--app-block-color", "rebeccapurple");
  document.body.appendChild(themeWrapper);

  mountPoint = document.createElement("div");
  themeWrapper.appendChild(mountPoint);

  editor = BlockNoteEditor.create({ initialContent: testDocument });
  editor.mount(mountPoint);
});

afterEach(() => {
  editor.unmount();
  editor._tiptapEditor.destroy();
  editor = undefined as any;
  themeWrapper.remove();
});

function stubDataTransfer() {
  const setDragImage: { calls: [Element, number, number][] } = { calls: [] };

  return {
    dataTransfer: {
      clearData: () => {},
      setData: () => {},
      setDragImage: (image: Element, x: number, y: number) =>
        setDragImage.calls.push([image, x, y]),
      effectAllowed: "",
    } as unknown as DataTransfer,
    setDragImage,
  };
}

describe("block drag preview", () => {
  it("attaches the preview inside the editor's portal container", () => {
    const sideMenu = editor.getExtension(SideMenuExtension)!;
    const { dataTransfer, setDragImage } = stubDataTransfer();

    sideMenu.blockDragStart(
      { dataTransfer, clientY: 0 },
      editor.getBlock("paragraph-0")!,
    );

    expect(setDragImage.calls).toHaveLength(1);
    const [preview] = setDragImage.calls[0];

    // `setDragImage` rasterizes the element in place, so a preview parked on
    // `document.body` renders without anything the editor inherits from its
    // ancestors. The portal container sits inside the editor's own tree, so the
    // cascade above the editor still reaches it.
    expect(editor.portalElement.contains(preview)).toBe(true);
    expect(themeWrapper.contains(preview)).toBe(true);
    expect(preview.className).toContain("bn-drag-preview");

    sideMenu.blockDragEnd();

    expect(preview.isConnected).toBe(false);
  });

  // The preview can't be hidden with `opacity`/`visibility`/`display` - Firefox
  // and WebKit rasterize the element as painted, so hiding it on the page hides
  // it in the drag image too. It's rendered normally and taken out again once
  // the browser has its snapshot, which is the end of the `dragstart` task.
  it("removes the preview once the browser has snapshotted it", async () => {
    const sideMenu = editor.getExtension(SideMenuExtension)!;
    const { dataTransfer, setDragImage } = stubDataTransfer();

    sideMenu.blockDragStart(
      { dataTransfer, clientY: 0 },
      editor.getBlock("paragraph-0")!,
    );

    const [preview] = setDragImage.calls[0];
    // Still there for the duration of the event itself, which is when the
    // snapshot is taken.
    expect(preview.isConnected).toBe(true);
    expect(getComputedStyle(preview as HTMLElement).opacity).not.toBe("0");

    await new Promise((resolve) => setTimeout(resolve, 0));

    // ...and gone by the next tick, without waiting for `dragend`.
    expect(preview.isConnected).toBe(false);

    sideMenu.blockDragEnd();
  });

  it("pins the preview to the width the blocks have in the editor", () => {
    const sideMenu = editor.getExtension(SideMenuExtension)!;
    const blockGroup =
      editor.prosemirrorView.dom.querySelector<HTMLElement>(".bn-block-group")!;
    // jsdom does no layout, so an explicit width is the only way for
    // `getComputedStyle` to report one.
    blockGroup.style.width = "512px";

    const { dataTransfer, setDragImage } = stubDataTransfer();
    sideMenu.blockDragStart(
      { dataTransfer, clientY: 0 },
      editor.getBlock("paragraph-0")!,
    );

    // Without this the clone shrink-wraps to the drag preview container, and
    // the block re-wraps to a width it never had in the editor.
    const [preview] = setDragImage.calls[0];
    expect((preview as HTMLElement).style.width).toBe("512px");
    // `.bn-drag-preview` has padding of its own, which an app-wide
    // `box-sizing: border-box` would otherwise take out of that width.
    expect((preview as HTMLElement).style.boxSizing).toBe("content-box");

    sideMenu.blockDragEnd();
  });

  it("replaces a previous preview rather than stacking them", () => {
    const sideMenu = editor.getExtension(SideMenuExtension)!;

    const first = stubDataTransfer();
    sideMenu.blockDragStart(
      { dataTransfer: first.dataTransfer, clientY: 0 },
      editor.getBlock("paragraph-0")!,
    );

    const second = stubDataTransfer();
    sideMenu.blockDragStart(
      { dataTransfer: second.dataTransfer, clientY: 0 },
      editor.getBlock("paragraph-1")!,
    );

    expect(first.setDragImage.calls[0][0].isConnected).toBe(false);
    expect(second.setDragImage.calls[0][0].isConnected).toBe(true);

    sideMenu.blockDragEnd();
  });
});
