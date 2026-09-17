import { useVirtualKeyboard } from "@blocknote/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { page } from "../../utils/context.js";

function ScrollingPage() {
  useVirtualKeyboard();
  return <div style={{ height: 3000 }}>Scrollable document</div>;
}

beforeEach(async () => {
  await page.viewport(393, 727);
  await render(<ScrollingPage />);
});

afterEach(async () => {
  await cleanup();
  vi.restoreAllMocks();
});

// Browser emulation resizes the layout viewport with the keyboard. Real iOS
// leaves it unchanged, allows window.scrollY to include the viewport pan, and
// can scroll another 98px into Safari's accessory-bar inset. Reproduce those
// measurements here; native gestures on the iOS simulator verify the model.
test("can scroll to the visual viewport's bottom with the keyboard open", () => {
  const viewport = window.visualViewport!;
  vi.spyOn(viewport, "height", "get").mockReturnValue(427);
  viewport.dispatchEvent(new Event("resize"));

  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const scrollY = vi.spyOn(window, "scrollY", "get");
  const height = document.documentElement.scrollHeight;

  // Both positions exceed the layout maximum, but still contain real content.
  scrollY.mockReturnValue(height - 727 + 100);
  document.dispatchEvent(new Event("scroll"));
  scrollY.mockReturnValue(height - 427);
  document.dispatchEvent(new Event("scroll"));
  viewport.dispatchEvent(new Event("scroll"));

  expect(scrollTo).not.toHaveBeenCalled();
});

test("excludes Safari's blank bottom inset even when it clips the viewport measurement", () => {
  const viewport = window.visualViewport!;
  const viewportHeight = vi.spyOn(viewport, "height", "get");
  viewportHeight.mockReturnValue(427);
  viewport.dispatchEvent(new Event("resize"));

  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const height = document.documentElement.scrollHeight;
  const scrollY = vi.spyOn(window, "scrollY", "get");
  scrollY.mockReturnValue(height - 427 + 98);
  vi.spyOn(window, "scrollX", "get").mockReturnValue(12);

  document.dispatchEvent(new Event("scroll"));
  expect(scrollTo).toHaveBeenLastCalledWith(12, height - 427);

  // A second drag at the bottom can shrink the reported height before the
  // scroll listener runs. It must not reopen the extra 98px of scroll range.
  viewportHeight.mockReturnValue(427 - 98);
  viewport.dispatchEvent(new Event("resize"));
  expect(scrollTo).toHaveBeenLastCalledWith(12, height - 427);

  // The document responds to scrollTo before Safari restores its viewport
  // measurements. That stale resize must not replace the unclipped height.
  scrollY.mockReturnValue(height - 427);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(427 - 98);
  viewport.dispatchEvent(new Event("resize"));
  scrollY.mockReturnValue(height - 427 + 98);
  document.dispatchEvent(new Event("scroll"));
  expect(scrollTo).toHaveBeenLastCalledWith(12, height - 427);
});

test("remeasures the keyboard after it closes and preserves keyboard-closed overscroll", () => {
  const viewport = window.visualViewport!;
  const viewportHeight = vi.spyOn(viewport, "height", "get");
  viewportHeight.mockReturnValue(427);
  viewport.dispatchEvent(new Event("resize"));

  viewportHeight.mockReturnValue(727);
  viewport.dispatchEvent(new Event("resize"));
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const height = document.documentElement.scrollHeight;
  const scrollY = vi.spyOn(window, "scrollY", "get");
  scrollY.mockReturnValue(height - 727 + 50);
  document.dispatchEvent(new Event("scroll"));
  expect(scrollTo).not.toHaveBeenCalled();

  // Reopen a taller keyboard while still at the bottom of the closed viewport.
  viewportHeight.mockReturnValue(367);
  viewport.dispatchEvent(new Event("resize"));
  scrollY.mockReturnValue(height - 367 + 98);
  document.dispatchEvent(new Event("scroll"));
  expect(scrollTo).toHaveBeenLastCalledWith(window.scrollX, height - 367);
});

test("a taller keyboard at the bottom makes the remaining content reachable", () => {
  const viewport = window.visualViewport!;
  const viewportHeight = vi.spyOn(viewport, "height", "get");
  viewportHeight.mockReturnValue(427);
  viewport.dispatchEvent(new Event("resize"));

  const height = document.documentElement.scrollHeight;
  const scrollY = vi.spyOn(window, "scrollY", "get");
  scrollY.mockReturnValue(height - 427);
  document.dispatchEvent(new Event("scroll"));

  // A suggestion strip shrinks the visible area without scrolling beyond the
  // document, unlike Safari's clipped measurement after a drag into the inset.
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(427);
  viewportHeight.mockReturnValue(367);
  viewport.dispatchEvent(new Event("resize"));
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  scrollY.mockReturnValue(height - 367);
  document.dispatchEvent(new Event("scroll"));
  expect(scrollTo).not.toHaveBeenCalled();
});

test("updates the scroll limit when the keyboard resizes the layout viewport", async () => {
  await page.viewport(393, 427);
  const height = document.documentElement.scrollHeight;
  const scrollY = vi.spyOn(window, "scrollY", "get");
  scrollY.mockReturnValue(height - 427);
  document.dispatchEvent(new Event("scroll"));

  await page.viewport(393, 367);
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  scrollY.mockReturnValue(height - 367);
  document.dispatchEvent(new Event("scroll"));
  expect(scrollTo).not.toHaveBeenCalled();
});
