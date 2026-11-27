import { isDOMElement } from "@blocknote/core";
import { ensureTouchEmulation } from "../utils/ensureTouchEmulation.js";

// The runner's reconciliation barrier must not depend on a test's scoped
// fake clock, which can be restored before the queued callback runs.
const scheduleFocusBarrier = window.setTimeout.bind(window);

function borrowProperty(
  target: object,
  key: string,
  temporary: { value: unknown; writable?: boolean; enumerable?: boolean },
) {
  const previous = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(
    target,
    key,
    previous?.configurable === false
      ? { value: temporary.value }
      : { ...temporary, configurable: true },
  );
  return () => {
    if (previous) {
      Object.defineProperty(target, key, previous);
    } else if (!Reflect.deleteProperty(target, key)) {
      throw new Error(`Could not release browser test property ${key}.`);
    }
  };
}

export function installBrowserTestViewport(doc: Document) {
  // BlockNoteView expects a host configured for mobile keyboard resizing.
  const viewport = doc.head.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  if (!viewport) {
    const tag = doc.createElement("meta");
    tag.name = "viewport";
    tag.content =
      "width=device-width, initial-scale=1, interactive-widget=resizes-content";
    doc.head.append(tag);
    return () => tag.remove();
  }

  const content = viewport.getAttribute("content");
  if (content?.includes("interactive-widget=")) {
    return;
  }
  viewport.content = `${content ?? ""}, interactive-widget=resizes-content`;
  return () => {
    if (content === null) {
      viewport.removeAttribute("content");
    } else {
      viewport.setAttribute("content", content);
    }
  };
}

function installIOSTouchPoints(
  device: Pick<Navigator, "userAgent" | "maxTouchPoints">,
) {
  // Playwright's WebKit `hasTouch` leaves maxTouchPoints at 0, but BlockNote's
  // isTouchDevice() requires a positive count. iOS Safari reports 5.
  if (/iphone/i.test(device.userAgent) && device.maxTouchPoints === 0) {
    return borrowProperty(device, "maxTouchPoints", { value: 5 });
  }
  return undefined;
}

async function withEditorFocus(runTest: () => Promise<void>) {
  let pendingEditorFocus = Promise.resolve();

  async function waitForEditorFocus() {
    let pending;
    do {
      pending = pendingEditorFocus;
      await pending;
    } while (pending !== pendingEditorFocus);
  }

  function onEditorFocus(event: FocusEvent) {
    if (
      isDOMElement(event.target) &&
      event.target.matches('.bn-editor[contenteditable="true"]')
    ) {
      // The bubbling listener runs after ProseMirror schedules its 20 ms
      // selection reconciliation in the focus handler.
      pendingEditorFocus = new Promise((resolve) =>
        scheduleFocusBarrier(resolve, 20),
      );
    }
  }

  // Provider commands run in Node and call this function in the test iframe.
  const restoreCallback = borrowProperty(
    window,
    "__blockNoteWaitForEditorFocus",
    { value: waitForEditorFocus, writable: true, enumerable: true },
  );
  document.addEventListener("focusin", onEditorFocus);
  try {
    await runTest();
  } finally {
    try {
      // Keep listening until drained: reconciliation can cause another focus.
      await waitForEditorFocus();
    } finally {
      document.removeEventListener("focusin", onEditorFocus);
      restoreCallback();
    }
  }
}

export async function withBrowserTestGlobals(runTest: () => Promise<void>) {
  // Examples read test options such as mockID from the window.
  const restoreOptions = borrowProperty(window, "__TEST_OPTIONS", {
    value: {},
    writable: true,
    enumerable: true,
  });
  try {
    const restoreTouchPoints = installIOSTouchPoints(navigator);
    try {
      if (restoreTouchPoints) {
        ensureTouchEmulation();
      }
      await withEditorFocus(runTest);
    } finally {
      restoreTouchPoints?.();
    }
  } finally {
    restoreOptions();
  }
}
