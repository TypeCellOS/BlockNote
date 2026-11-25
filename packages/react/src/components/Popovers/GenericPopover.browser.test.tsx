// Closing a popover used to re-parse a stored HTML string
// (`dangerouslySetInnerHTML`). That re-applies inline style attributes, which
// a CSP `style-src` without 'unsafe-inline' blocks. Rather than injecting a
// page-wide CSP, assert directly that closing does not perform that write.
import type { CSSProperties, ReactElement } from "react";
import { flushSync } from "react-dom";
import { describe, expect, vi } from "vite-plus/test";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";

import { PortalElementAnchor } from "../../editor/PortalElementOverride.js";
import { GenericPopover } from "./GenericPopover.js";

const POPOVER_CLASS = "bn-test-popover";
const LABEL_ID = "popover-label";

const CLOSE_DURATION = 200;

function popover() {
  return document.querySelector<HTMLElement>(`.${POPOVER_CLASS}`);
}

function labels() {
  return document.querySelectorAll<HTMLElement>(`[data-testid="${LABEL_ID}"]`);
}

function Harness(props: {
  open: boolean;
  marker: string;
  zIndex?: number;
  childrenWhileClosed?: boolean;
  focusManagerDisabled?: boolean;
}) {
  const labelStyle: CSSProperties & { "--bn-test": string } = {
    color: "rgb(255, 0, 0)",
    "--bn-test": "1",
  };
  const content = (
    <span data-testid={LABEL_ID} style={labelStyle}>
      {props.marker}
    </span>
  );

  return (
    <GenericPopover
      elementProps={{
        className: POPOVER_CLASS,
        style: { zIndex: props.zIndex ?? 1 },
      }}
      focusManagerProps={
        props.focusManagerDisabled === false ? undefined : { disabled: true }
      }
      useFloatingOptions={{ open: props.open }}
      useTransitionStatusProps={{
        duration: { open: 0, close: CLOSE_DURATION },
      }}
      useTransitionStylesProps={{
        duration: { open: 0, close: CLOSE_DURATION },
      }}
    >
      {props.open || props.childrenWhileClosed ? content : null}
    </GenericPopover>
  );
}

async function setupPopover(setupEditor: SetupEditor, children: ReactElement) {
  function withPortal(child: ReactElement) {
    return <PortalElementAnchor>{child}</PortalElementAnchor>;
  }
  const { rerender } = await setupEditor({
    skin: "raw",
    props: { renderEditor: false },
    children: withPortal(children),
  });
  await expect.poll(popover).not.toBeNull();
  return (next: ReactElement) => rerender({ children: withPortal(next) });
}

function withCloseClock(test: () => void) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    test();
  } finally {
    vi.useRealTimers();
  }
}

function advanceCloseClock(milliseconds: number) {
  flushSync(() => vi.advanceTimersByTime(milliseconds));
}

describe("GenericPopover close transition", () => {
  it("keeps the open content visible while closing without assigning innerHTML", async ({
    setupEditor,
  }) => {
    const render = await setupPopover(
      setupEditor,
      <Harness open marker="Slash menu" />,
    );

    expect(popover()?.textContent).toContain("Slash menu");

    const writes: Array<{ element: Element; value: string }> = [];
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "innerHTML",
    );
    if (!descriptor?.set || !descriptor.get) {
      throw new Error("Expected Element.innerHTML to be configurable");
    }
    // oxlint-disable-next-line typescript/unbound-method -- Forward the actual target as `this`.
    const setInnerHTML = descriptor.set;

    withCloseClock(() => {
      Object.defineProperty(Element.prototype, "innerHTML", {
        ...descriptor,
        set(this: Element, value: string) {
          writes.push({ element: this, value: String(value) });
          setInnerHTML.call(this, value);
        },
      });
      try {
        render(<Harness open={false} marker="replaced while closing" />);
      } finally {
        Object.defineProperty(Element.prototype, "innerHTML", descriptor);
      }

      const floating = popover();
      expect(floating?.textContent).toContain("Slash menu");
      expect(floating?.textContent).not.toContain("replaced while closing");
      expect(labels()).toHaveLength(1);
      const label = labels()[0];
      expect(label?.style.color).toBe("rgb(255, 0, 0)");
      expect(label?.style.getPropertyValue("--bn-test")).toBe("1");
      expect(floating?.style.opacity).toBe("0");
      // Re-parsing HTML that contains `style="..."` is what CSP rejects.
      expect(
        writes.filter(
          (write) =>
            (write.element === floating || floating?.contains(write.element)) &&
            (write.value.includes("style") ||
              write.value.includes("Slash menu")),
        ),
      ).toEqual([]);

      advanceCloseClock(CLOSE_DURATION - 1);
      render(
        <Harness open={false} marker="replaced while closing" zIndex={4} />,
      );
      expect(popover()?.textContent).toContain("Slash menu");
      expect(labels()).toHaveLength(1);

      advanceCloseClock(1);
      expect(popover()).toBeNull();
      expect(labels()).toHaveLength(0);
    });
  });

  it("ignores child updates during the close transition", async ({
    setupEditor,
  }) => {
    const render = await setupPopover(
      setupEditor,
      <Harness open marker="Slash menu" />,
    );
    withCloseClock(() => {
      render(<Harness open={false} marker="replaced while closing" />);
      render(
        <Harness
          open={false}
          marker="replaced while closing"
          childrenWhileClosed
        />,
      );

      expect(popover()?.textContent).toContain("Slash menu");
      expect(popover()?.textContent).not.toContain("replaced while closing");
      expect(labels()).toHaveLength(1);
      advanceCloseClock(CLOSE_DURATION);
    });
  });

  it("drops the frozen content when the popover opens again", async ({
    setupEditor,
  }) => {
    const render = await setupPopover(
      setupEditor,
      <Harness open marker="Slash menu" />,
    );
    withCloseClock(() => {
      render(<Harness open={false} marker="replaced while closing" />);
      render(<Harness open marker="Open again" />);
      advanceCloseClock(CLOSE_DURATION);

      expect(popover()?.textContent).toContain("Open again");
      expect(popover()?.textContent).not.toContain("Slash menu");
      expect(labels()).toHaveLength(1);
    });
  });

  it("keeps the close snapshot when the focus manager is enabled", async ({
    setupEditor,
  }) => {
    const render = await setupPopover(
      setupEditor,
      <Harness open marker="Slash menu" focusManagerDisabled={false} />,
    );
    withCloseClock(() => {
      render(
        <Harness
          open={false}
          marker="replaced while closing"
          focusManagerDisabled={false}
        />,
      );

      expect(popover()?.textContent).toContain("Slash menu");
      expect(labels()).toHaveLength(1);
      advanceCloseClock(CLOSE_DURATION);
    });
  });
});
