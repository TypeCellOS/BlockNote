import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { browserName, page } from "../../utils/context.js";
import {
  clickAt,
  dragAndDropBlock,
  mouseSequence,
  moveMouseOverElement,
  startBlockDrag,
} from "../../utils/mouse.js";

describe.skipIf(browserName !== "chromium")(
  "native mouse ownership in one tester iframe",
  { concurrent: false, shuffle: false },
  () => {
    const order: string[] = [];
    let container: HTMLElement;
    let source: HTMLElement;
    let target: HTMLButtonElement;
    let over = false;
    let buttons = -1;

    beforeAll(() => {
      container = document.createElement("div");
      container.className = "bn-container";
      container.style.cssText =
        "position:fixed;top:100px;left:100px;width:400px";
      container.innerHTML = `
        <div data-node-type="blockContainer" data-id="source">
          <div class="bn-block-content">
            <button draggable="true" data-test="dragHandle"
              data-side-menu-block-id="source">Drag</button>
          </div>
        </div>
        <button style="margin-top:80px">Drop</button>
      `;
      document.body.append(container);
      const handle = container.querySelector<HTMLButtonElement>(
        "[data-test=dragHandle]",
      )!;
      source = handle.parentElement!;
      target = container.querySelector<HTMLButtonElement>(":scope > button")!;
      handle.addEventListener("dragstart", (event) => {
        if (!event.isTrusted) {
          return;
        }
        event.dataTransfer?.setData("text/plain", "source");
        const preview = document.createElement("span");
        preview.className = "bn-drag-preview";
        container.append(preview);
        order.push("dragstart");
      });
      handle.addEventListener("dragend", (event) => {
        if (event.isTrusted) {
          order.push(`dragend:${event.dataTransfer?.dropEffect}`);
        }
        container.querySelector(".bn-drag-preview")?.remove();
      });
      target.addEventListener("dragover", (event) => {
        event.preventDefault();
        over ||= event.isTrusted;
      });
      target.addEventListener("drop", (event) => {
        event.preventDefault();
        if (event.isTrusted) {
          order.push("drop");
        }
      });
      target.addEventListener("mousemove", (event) => {
        if (event.isTrusted) {
          buttons = event.buttons;
        }
      });
      target.addEventListener("click", (event) => {
        if (event.isTrusted) {
          order.push("click");
        }
      });
    });

    afterAll(() => container.remove());

    async function moveToDropTarget() {
      over = false;
      await moveMouseOverElement(target);
      // Chromium can require a second move before delivering native dragover.
      await moveMouseOverElement(target);
      await expect.poll(() => over).toBe(true);
    }

    test.fails("abandons a trusted drag before releasing the button", async ({
      onTestFinished,
    }) => {
      await startBlockDrag(source, onTestFinished);
      await moveToDropTarget();
      order.push("test failure");
      throw new Error("Deliberately abort before dropping");
    });

    test("cancels before the next input and disarms cleanup after raw mouse-up", async ({
      onTestFinished,
    }) => {
      expect(order).toEqual(["dragstart", "test failure", "dragend:none"]);
      await moveMouseOverElement(target);
      expect(buttons).toBe(0);
      const { x, y, width, height } = target.getBoundingClientRect();
      await clickAt(x + width / 2, y + height / 2);
      expect(order.at(-1)).toBe("click");

      // Hooks run in reverse registration order. Leave an unrelated press
      // active while the completed drag's cleanup runs, then verify it survived.
      let pressed = false;
      onTestFinished(async () => {
        if (!pressed) {
          return;
        }
        try {
          buttons = -1;
          await mouseSequence([{ type: "move", x: x + 2, y: y + 2 }]);
          expect(buttons).toBe(1);
        } finally {
          await mouseSequence([{ type: "up" }]);
        }
      });
      await startBlockDrag(source, onTestFinished);
      await moveToDropTarget();
      await mouseSequence([{ type: "up" }]);
      expect(order.slice(-3)).toEqual([
        "dragstart",
        "drop",
        expect.stringMatching(/^dragend:(?!none$)/),
      ]);
      await mouseSequence([{ type: "down" }]);
      pressed = true;
    });

    test("one-shot drag can release its native button before the drop settles", async (context) => {
      let release: (() => unknown) | undefined;
      const rect = target.getBoundingClientRect();
      const eventsBefore = order.length;
      const bounds = vi
        .spyOn(target, "getBoundingClientRect")
        .mockImplementation(() => {
          // Simulate the finish hook firing while the drop is about to send
          // input. The transport must process cancellation before that input.
          void release?.();
          return rect;
        });
      try {
        await expect(
          dragAndDropBlock(source, target, false, (dispose) => {
            context.onTestFinished(dispose);
            release = () => dispose(context);
          }),
        ).rejects.toThrow("The drag no longer owns the positional mouse");
      } finally {
        bounds.mockRestore();
      }

      expect(order.slice(eventsBefore)).toEqual(["dragstart", "dragend:none"]);
      await moveMouseOverElement(target);
      expect(buttons).toBe(0);
      await clickAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
      expect(order.at(-1)).toBe("click");
    });

    test("rejects a coordinate batch before input if the tester is hidden", async () => {
      const frameElement = window.frameElement;
      const iframe = [
        ...window.parent.document.querySelectorAll("iframe"),
      ].find((element) => element === frameElement);
      if (!iframe) {
        throw new Error("Expected a same-origin tester iframe.");
      }
      const display = iframe.style.display;
      const parentDoc = iframe.ownerDocument;
      const events = new AbortController();
      let moves = 0;
      parentDoc.addEventListener("mousemove", () => moves++, {
        signal: events.signal,
      });
      try {
        iframe.style.display = "none";
        await expect(
          mouseSequence([{ type: "move", x: 15, y: 15 }]),
        ).rejects.toThrow("tester iframe has no box");
        expect(moves).toBe(0);
      } finally {
        iframe.style.display = display;
        events.abort();
      }
      await expect
        .element(page.getByRole("button", { name: "Drop" }))
        .toBeVisible();
    });
  },
);
