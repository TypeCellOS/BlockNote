import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { DRAG_HANDLE_SELECTOR, EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

// What the browser shows next to the cursor during a block drag is an image it
// rasterizes from a clone of the block. The composited image itself is drawn by
// the OS and can't be captured here, so these tests screenshot the element that
// was handed to `setDragImage` instead - if that renders wrong, the image the
// user sees is wrong in the same way.
//
// The dragged block gets a background colour on purpose: a preview that has
// been cut off from the editor's CSS still carries the right classes and
// attributes, so it looks correct in the DOM and only gives itself away as a
// transparent box when it's actually painted.

const COLORED_BLOCK_SELECTOR = '[data-background-color="blue"]';
const DRAG_PREVIEW_SELECTOR = ".bn-drag-preview";

// Replaces the document with a single blue-backgrounded paragraph.
async function seedColoredBlock() {
  (
    window as unknown as {
      ProseMirror: { commands: { setContent: (doc: unknown) => void } };
    }
  ).ProseMirror.commands.setContent({
    type: "doc",
    content: [
      {
        type: "blockGroup",
        content: [
          {
            type: "blockContainer",
            attrs: { id: "0" },
            content: [
              {
                type: "paragraph",
                attrs: {
                  backgroundColor: "blue",
                  textColor: "default",
                  textAlignment: "left",
                },
                content: [{ type: "text", text: "Drag me" }],
              },
            ],
          },
        ],
      },
    ],
  });

  return waitForSelector(`${EDITOR_SELECTOR} ${COLORED_BLOCK_SELECTOR}`);
}

/**
 * Starts a drag on `block` and returns the element the browser was given to
 * rasterize, reattached where it was so it can be inspected and screenshotted.
 *
 * The element itself only lives until the end of the `dragstart` task - it
 * can't be hidden with `opacity` (Firefox and WebKit rasterize the element as
 * painted, so that would erase it from the drag image too), so it's removed as
 * soon as the browser has its snapshot. Spying on `setDragImage` is therefore
 * both the only way to get hold of it and the most direct assertion available:
 * this is exactly the element the browser was asked to draw.
 *
 * The event is dispatched directly rather than driven with the mouse because
 * Playwright can't simulate a native drag in Firefox - which is why the drag &
 * drop tests next door skip it - and the preview is built in the `dragstart`
 * handler, so this covers the part under test in all three browsers.
 */
async function captureDragPreview(block: Element): Promise<HTMLElement> {
  await moveMouseOverElement(block);
  const handle = await waitForSelector(DRAG_HANDLE_SELECTOR);
  await sleep(100);

  const captured: { image?: Element; container?: Element | null } = {};
  // Deliberately unbound - it's called back with `.call(this, ...)` below, and
  // reassigned to the prototype afterwards.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setDragImage = DataTransfer.prototype.setDragImage;
  DataTransfer.prototype.setDragImage = function (image, x, y) {
    captured.image = image;
    captured.container = image.parentElement;
    return setDragImage.call(this, image, x, y);
  };

  try {
    handle.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      }),
    );
  } finally {
    DataTransfer.prototype.setDragImage = setDragImage;
  }

  if (!captured.image || !captured.container) {
    throw new Error("No drag preview was handed to setDragImage");
  }

  // Wait out the removal, then put it back in the container it came from -
  // reattaching it anywhere else would change the CSS that applies to it, which
  // is half of what's under test.
  await vi.waitFor(() => {
    if (captured.image!.isConnected) {
      throw new Error("Drag preview not cleaned up yet");
    }
  });
  captured.container.appendChild(captured.image);

  return captured.image as HTMLElement;
}

function endDrag() {
  document
    .querySelector(DRAG_HANDLE_SELECTOR)
    ?.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
}

describe("Block drag preview", () => {
  beforeEach(async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
  });

  test("renders the dragged block with its background intact", async () => {
    const block = await seedColoredBlock();
    const expectedBackground = getComputedStyle(block).backgroundColor;

    const preview = await captureDragPreview(block);

    const previewBlock = preview.querySelector<HTMLElement>(
      COLORED_BLOCK_SELECTOR,
    )!;
    expect(getComputedStyle(previewBlock).backgroundColor).toBe(
      expectedBackground,
    );

    // Pin it somewhere deterministic for the capture. `.bn-drag-preview` sits
    // behind the page's content, which is what keeps it out of sight while the
    // browser snapshots it, but would also put it behind the editor here.
    preview.style.cssText +=
      ";position:fixed;top:200px;left:40px;z-index:9999;";

    await expectElement(preview).toMatchScreenshot("blockDragPreview");

    endDrag();
  });

  test("is visible rather than hidden with opacity", async () => {
    // The old approach - `opacity: 0.001` - only worked in Chrome. Firefox and
    // WebKit rasterize the element as painted, so a near-transparent element
    // produced a near-invisible drag image in both.
    const block = await seedColoredBlock();
    const preview = await captureDragPreview(block);

    const { opacity, visibility, display } = getComputedStyle(preview);
    expect(Number(opacity)).toBeGreaterThan(0.99);
    expect(visibility).toBe("visible");
    expect(display).not.toBe("none");

    endDrag();
  });

  test("matches the width the block has in the editor", async () => {
    const block = await seedColoredBlock();
    const widthInEditor = block.getBoundingClientRect().width;

    const preview = await captureDragPreview(block);

    // Pulled out of `.bn-editor` the clone has nothing constraining it, so
    // without an explicit width it reflows to whatever the container gives it.
    const previewBlock = preview.querySelector(".bn-block-outer")!;
    expect(previewBlock.getBoundingClientRect().width).toBeCloseTo(
      widthInEditor,
      0,
    );

    endDrag();
  });

  test("is taken back out of the page once the drag has started", async () => {
    const block = await seedColoredBlock();

    // `captureDragPreview` only resolves once the preview has been removed, so
    // reaching here at all is the assertion; this pins down that nothing is
    // left behind afterwards either.
    const preview = await captureDragPreview(block);
    preview.remove();

    endDrag();
    await sleep(100);

    expect(document.querySelectorAll(DRAG_PREVIEW_SELECTOR)).toHaveLength(0);
  });
});
