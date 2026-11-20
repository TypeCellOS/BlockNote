import { afterEach, expect, it } from "vite-plus/test";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { useTableHandlesPositioning } from "./useTableHandlesPositioning.js";
import { useExtendButtonsPositioning } from "./useExtendButtonsPositioning.js";

let root: Root | undefined;
let container: HTMLElement;
afterEach(async () => {
  flushSync(() => root?.unmount());
  container?.remove();
});
const table = new DOMRect(200, 200, 300, 100);
const cell = new DOMRect(200, 200, 100, 50);

/* eslint-disable react/refs -- These APIs return callback refs and render styles, not mutable ref objects. */
function Fixture({ direction }: { direction?: "ltr" | "rtl" }) {
  const handles = useTableHandlesPositioning(
    true,
    cell,
    table,
    undefined,
    direction,
  );
  const extenders = useExtendButtonsPositioning(true, true, table, direction);
  return (
    <>
      <div
        data-testid="row"
        ref={handles.rowHandle.ref}
        style={{ ...handles.rowHandle.style, width: 20, height: 20 }}
      />
      <div
        data-testid="columns"
        ref={extenders.addOrRemoveColumnsButton.ref}
        style={{ ...extenders.addOrRemoveColumnsButton.style, width: 20 }}
      />
    </>
  );
}
/* eslint-enable react/refs */

it.each([undefined, "rtl"] as const)(
  "exported table positioning supports %s without changing the default",
  async (direction) => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    flushSync(() => root!.render(<Fixture direction={direction} />));
    await expect
      .poll(() => {
        const row = container
          .querySelector('[data-testid="row"]')!
          .getBoundingClientRect();
        const columns = container
          .querySelector('[data-testid="columns"]')!
          .getBoundingClientRect();
        return direction === "rtl"
          ? row.left === table.right - 10 && columns.right === table.left
          : row.right === table.left + 10 && columns.left === table.right;
      })
      .toBe(true);
  },
);
