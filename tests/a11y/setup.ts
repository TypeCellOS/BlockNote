import { afterEach, beforeEach } from "vite-plus/test";

let pendingEditorFocus = Promise.resolve();

function onEditorFocus(event: FocusEvent) {
  if (
    event.target instanceof HTMLElement &&
    event.target.matches('.bn-editor[contenteditable="true"]')
  ) {
    // ProseMirror schedules selection reconciliation 20 ms after focus.
    // This bubbling listener runs after its focus handler has scheduled that work.
    pendingEditorFocus = new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export async function waitForEditorFocus() {
  let pending;
  do {
    pending = pendingEditorFocus;
    await pending;
  } while (pending !== pendingEditorFocus);
}

beforeEach(() => {
  document.addEventListener("focusin", onEditorFocus);
});

afterEach(async () => {
  document.removeEventListener("focusin", onEditorFocus);
  await waitForEditorFocus();
  pendingEditorFocus = Promise.resolve();
});
