import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vite-plus/test";

import "../../editor/styles.css";
import FrimoussePicker from "./FrimoussePicker.js";

let host: HTMLFormElement;
let root: Root;

afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

function renderPicker(
  customTheme = false,
  onEmojiSelect: (emoji: string) => void = () => {},
) {
  host = document.createElement("form");
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
    root.render(<FrimoussePicker locale="en" onEmojiSelect={onEmojiSelect} />);
  });
}

function visibleElement(selector: string): HTMLElement {
  const element = Array.from(host.querySelectorAll<HTMLElement>(selector)).find(
    (element) => !element.closest("[aria-hidden]"),
  );
  expect(element).toBeDefined();
  return element!;
}

it("loads bundled emojis without fetching and selects a reaction without submitting its form", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const onEmojiSelect = vi.fn();
  renderPicker(false, onEmojiSelect);
  const onSubmit = vi.fn((event: Event) => event.preventDefault());
  host.addEventListener("submit", onSubmit);

  const emoji = await vi.waitFor(() => visibleElement("[frimousse-emoji]"));
  emoji.click();

  expect(onEmojiSelect).toHaveBeenCalledWith(emoji.textContent);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
});

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
