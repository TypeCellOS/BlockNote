// @vitest-environment node
// Tests key routing only. Structural fixtures do not reproduce native OS IME.
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useSuggestionMenuKeyboardHandler } from "./useSuggestionMenuKeyboardHandler.js";

const { setSelectedIndex } = vi.hoisted(() => ({ setSelectedIndex: vi.fn() }));

vi.mock("react", () => ({
  default: {},
  useState: () => [0, setSelectedIndex],
}));

function keyboardEvent(key: string, isComposing: boolean, keyCode: number) {
  // Only the event fields consumed by the hook are needed in node.
  return {
    key,
    isComposing,
    keyCode,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent;
}

function reactEvent(nativeEvent: KeyboardEvent) {
  return {
    key: nativeEvent.key,
    keyCode: nativeEvent.keyCode,
    nativeEvent,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.KeyboardEvent;
}

const menuKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Enter"];

describe("suggestion menu keyboard composition routing", () => {
  beforeEach(() => vi.clearAllMocks());

  describe.each([
    { name: "native", wrap: (event: KeyboardEvent) => event },
    { name: "React", wrap: reactEvent },
  ])("$name events", ({ wrap }) => {
    describe.each([
      { signal: "isComposing", isComposing: true, keyCode: 13 },
      { signal: "keyCode 229", isComposing: false, keyCode: 229 },
    ])("$signal", ({ isComposing, keyCode }) => {
      it.each(menuKeys)("leaves %s to the IME", (key) => {
        const event = wrap(keyboardEvent(key, isComposing, keyCode));
        const click = vi.fn();
        const { handler } = useSuggestionMenuKeyboardHandler(["a", "b"], click);

        expect(handler(event)).toBe(false);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopPropagation).not.toHaveBeenCalled();
        expect(setSelectedIndex).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
      });
    });

    it.each([
      ["ArrowUp", 2],
      ["ArrowDown", 1],
      ["PageUp", 0],
      ["PageDown", 2],
    ] as const)("still navigates with ordinary %s", (key, index) => {
      const event = wrap(keyboardEvent(key, false, 0));
      const click = vi.fn();
      const { handler } = useSuggestionMenuKeyboardHandler(
        ["a", "b", "c"],
        click,
      );

      expect(handler(event)).toBe(true);
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(event.stopPropagation).not.toHaveBeenCalled();
      expect(setSelectedIndex).toHaveBeenCalledWith(index);
      expect(click).not.toHaveBeenCalled();
    });

    it("accepts the next ordinary Enter after ignoring an IME Enter", () => {
      const click = vi.fn();
      const { handler } = useSuggestionMenuKeyboardHandler(["a", "b"], click);
      handler(wrap(keyboardEvent("Enter", true, 229)));
      const event = wrap(keyboardEvent("Enter", false, 13));

      expect(handler(event)).toBe(true);
      expect(click).toHaveBeenCalledExactlyOnceWith("a");
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    });

    it("ignores unrelated keys", () => {
      const event = wrap(keyboardEvent("a", false, 65));
      const click = vi.fn();
      expect(
        useSuggestionMenuKeyboardHandler(["a"], click).handler(event),
      ).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(setSelectedIndex).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
    });

    it("does not select or accept a nonexistent item in an empty menu", () => {
      const click = vi.fn();
      const { handler } = useSuggestionMenuKeyboardHandler([], click);
      for (const key of menuKeys) {
        const event = wrap(keyboardEvent(key, false, 0));
        expect(handler(event)).toBe(true);
        expect(event.preventDefault).toHaveBeenCalledOnce();
      }
      expect(setSelectedIndex).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
    });
  });
});
