import { afterEach, describe, expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import {
  TableOfContentsExtension,
  type TableOfContentsOptions,
} from "./TableOfContents.js";

// The scroll spy with real layout: an editor in a 400px scroll container,
// with sections of body text long enough to scroll each heading past the top.

const OFFSET = 40;

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

function section(id: string, paragraphs: number): PartialBlock[] {
  return [
    { id, type: "heading", props: { level: 2 }, content: `Section ${id}` },
    ...Array.from({ length: paragraphs }, () => ({
      type: "paragraph" as const,
      content: "Body text",
    })),
  ];
}

function mountEditor(options?: TableOfContentsOptions) {
  const container = document.createElement("div");
  container.style.cssText = "height: 400px; overflow: auto;";
  const editorElement = document.createElement("div");
  container.append(editorElement);
  document.body.append(container);

  const editor = BlockNoteEditor.create({
    initialContent: [
      ...section("a", 20),
      ...section("b", 20),
      ...section("c", 20),
      // Too short for the last heading to scroll up to the reading line.
      ...section("last", 1),
    ],
    extensions: [TableOfContentsExtension(options)],
  });
  editor.mount(editorElement);
  cleanup = () => {
    editor.unmount();
    container.remove();
  };
  const toc = editor.getExtension(TableOfContentsExtension)!;

  /** The scroll position that puts a heading at the reading line. */
  function scrollTopOf(blockId: string) {
    const heading = container.querySelector(
      `[data-node-type="blockContainer"][data-id="${blockId}"]`,
    )!;
    return (
      heading.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      OFFSET
    );
  }

  return { editor, editorElement, container, toc, scrollTopOf };
}

/** Lets the scroll event and the spy's frame after it run. */
async function settle() {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

describe("TableOfContentsExtension scroll spy", () => {
  it("activates the entry whose heading last scrolled up to the reading line", async () => {
    const { container, toc, scrollTopOf } = mountEditor({
      scrollOffset: OFFSET,
    });
    await settle();
    expect(toc.store.state.activeBlockId).toBe("a");

    container.scrollTop = scrollTopOf("b") - 5;
    await settle();
    expect(toc.store.state.activeBlockId).toBe("a");

    container.scrollTop = scrollTopOf("b");
    await settle();
    expect(toc.store.state.activeBlockId).toBe("b");

    container.scrollTop = scrollTopOf("c") + 100;
    await settle();
    expect(toc.store.state.activeBlockId).toBe("c");
  });

  it("activates the last entry once scrolled to the bottom", async () => {
    const { container, toc } = mountEditor({ scrollOffset: OFFSET });
    const bottom = container.scrollHeight - container.clientHeight;

    container.scrollTop = bottom - 50;
    await settle();
    expect(toc.store.state.activeBlockId).toBe("c");

    container.scrollTop = bottom;
    await settle();
    expect(toc.store.state.activeBlockId).toBe("last");
  });

  // Unmounting and mounting again is what React's StrictMode does on every
  // mount, and the entries are then those of the first mount.
  it("keeps following the scroll after the editor is mounted again", async () => {
    const { editor, editorElement, container, toc, scrollTopOf } = mountEditor({
      scrollOffset: OFFSET,
    });
    editor.unmount();
    editor.mount(editorElement);
    await settle();

    container.scrollTop = scrollTopOf("b");
    await settle();
    expect(toc.store.state.activeBlockId).toBe("b");
  });
});
