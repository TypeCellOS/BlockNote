// Closing a popover used to re-parse a stored HTML string
// (`dangerouslySetInnerHTML`). That re-applies inline style attributes, which
// a CSP `style-src` without 'unsafe-inline' blocks. jsdom does not enforce
// CSP, but it does perform the assignment, so this test fails on that write
// and on a close transition that drops or replaces the open content.
import { act, type CSSProperties, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  BlockNoteContext,
  type BlockNoteContextValue,
} from "../../editor/BlockNoteContext.js";
import { GenericPopover } from "./GenericPopover.js";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const POPOVER_CLASS = "bn-test-popover";
const LABEL_ID = "popover-label";

let reactHost: HTMLDivElement;
let editorDom: HTMLDivElement;
let root: Root;
let editor: NonNullable<BlockNoteContextValue["editor"]>;

function createEditor(domElement: HTMLElement) {
  return {
    domElement,
    isWithinEditor: () => false,
    _tiptapEditor: {
      on() {
        return;
      },
      off() {
        return;
      },
    },
  } as unknown as NonNullable<BlockNoteContextValue["editor"]>;
}

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
    <BlockNoteContext.Provider value={{ editor }}>
      <GenericPopover
        elementProps={{
          className: POPOVER_CLASS,
          style: { zIndex: props.zIndex ?? 1 },
        }}
        focusManagerProps={
          props.focusManagerDisabled === false ? undefined : { disabled: true }
        }
        useFloatingOptions={{ open: props.open }}
      >
        {props.open || props.childrenWhileClosed ? content : null}
      </GenericPopover>
    </BlockNoteContext.Provider>
  );
}

async function render(element: ReactElement) {
  await act(async () => {
    root.render(element);
  });
}

beforeEach(() => {
  reactHost = document.createElement("div");
  const portalParent = document.createElement("div");
  editorDom = document.createElement("div");
  portalParent.append(editorDom);
  document.body.append(reactHost, portalParent);
  root = createRoot(reactHost);
  editor = createEditor(editorDom);
});

afterEach(async () => {
  await act(async () => root.unmount());
  reactHost.remove();
  editorDom.parentElement?.remove();
});

describe("GenericPopover close transition", () => {
  it("keeps the open content visible while closing without assigning innerHTML", async () => {
    await render(<Harness open marker="Slash menu" />);

    expect(popover()?.textContent).toContain("Slash menu");

    const writes: Array<{ element: Element; value: string }> = [];
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "innerHTML",
    );
    if (!descriptor?.set || !descriptor.get) {
      throw new Error("Expected Element.innerHTML to be configurable");
    }
    // oxlint-disable-next-line typescript/unbound-method -- Called with the target element as `this` below.
    const setInnerHTML = descriptor.set;
    Object.defineProperty(Element.prototype, "innerHTML", {
      ...descriptor,
      set(this: Element, value: string) {
        writes.push({ element: this, value: String(value) });
        setInnerHTML.call(this, value);
      },
    });

    try {
      await render(<Harness open={false} marker="replaced while closing" />);
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
          (write.value.includes("style") || write.value.includes("Slash menu")),
      ),
    ).toEqual([]);

    await render(
      <Harness open={false} marker="replaced while closing" zIndex={4} />,
    );
    expect(popover()?.textContent).toContain("Slash menu");
    expect(labels()).toHaveLength(1);
  });

  it("ignores child updates during the close transition", async () => {
    await render(<Harness open marker="Slash menu" />);
    await render(<Harness open={false} marker="replaced while closing" />);
    await render(
      <Harness
        open={false}
        marker="replaced while closing"
        childrenWhileClosed
      />,
    );

    expect(popover()?.textContent).toContain("Slash menu");
    expect(popover()?.textContent).not.toContain("replaced while closing");
    expect(labels()).toHaveLength(1);
  });

  it("drops the frozen content when the popover opens again", async () => {
    await render(<Harness open marker="Slash menu" />);
    await render(<Harness open={false} marker="replaced while closing" />);
    await render(<Harness open marker="Open again" />);

    expect(popover()?.textContent).toContain("Open again");
    expect(popover()?.textContent).not.toContain("Slash menu");
    expect(labels()).toHaveLength(1);
  });

  it("keeps the close snapshot when the focus manager is enabled", async () => {
    await render(
      <Harness open marker="Slash menu" focusManagerDisabled={false} />,
    );
    await render(
      <Harness
        open={false}
        marker="replaced while closing"
        focusManagerDisabled={false}
      />,
    );

    expect(popover()?.textContent).toContain("Slash menu");
    expect(labels()).toHaveLength(1);
  });
});
