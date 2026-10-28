import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vite-plus/test";

import "../../editor/styles.css";
import FrimoussePicker from "./FrimoussePicker.js";

let host: HTMLDivElement;
let root: Root;

afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

function renderPicker(customTheme = false) {
  host = document.createElement("div");
  host.className = "bn-root";
  if (customTheme) {
    host.style.setProperty("--bn-colors-menu-background", "#182030");
    host.style.setProperty("--bn-colors-menu-text", "#ffffff");
    host.style.setProperty("--bn-colors-editor-text", "#000000");
    host.style.setProperty("--bn-colors-hovered-background", "#273244");
    host.style.setProperty("--bn-colors-hovered-text", "#eeeeee");
  }
  host.style.color = "var(--bn-colors-menu-text)";
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => {
    root.render(<FrimoussePicker locale="en" onEmojiSelect={() => {}} />);
  });
}

function visibleElement(selector: string): HTMLElement {
  const element = Array.from(host.querySelectorAll<HTMLElement>(selector)).find(
    (element) => !element.closest("[aria-hidden]"),
  );
  expect(element).toBeDefined();
  return element!;
}

it("does not paint padded category headers over the first emoji row without a CSS reset", async () => {
  renderPicker();

  await vi.waitFor(() => {
    const header = visibleElement("[frimousse-category-header]");
    const row = visibleElement("[frimousse-row]");
    expect(row.querySelector("[frimousse-emoji]")).not.toBeNull();
    expect(header.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(header.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      row.getBoundingClientRect().top + 0.5,
    );
  });
});

it.each([false, true])(
  "uses readable menu foregrounds with customTheme=%s",
  async (customTheme) => {
    renderPicker(customTheme);

    await vi.waitFor(() => {
      const menuText = getComputedStyle(host).color;
      expect(
        getComputedStyle(visibleElement("[frimousse-category-header]")).color,
      ).toBe(menuText);
      expect(getComputedStyle(visibleElement("[frimousse-search]")).color).toBe(
        customTheme ? "rgb(238, 238, 238)" : menuText,
      );
      expect(
        getComputedStyle(visibleElement(".bn-frimousse-active-emoji-label"))
          .color,
      ).toBe(menuText);
    });
  },
);
