import { useEffect, useRef } from "react";
import { describe, expect, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { useSuggestionMenuKeyboardHandler } from "./useSuggestionMenuKeyboardHandler.js";

function Harness({
  eventSource,
  items,
  onItemClick,
  onBubble,
}: {
  eventSource: "native" | "react";
  items: string[];
  onItemClick: (item: string) => void;
  onBubble?: () => void;
}) {
  const target = useRef<HTMLButtonElement>(null);
  const { selectedIndex, handler } = useSuggestionMenuKeyboardHandler(
    items,
    onItemClick,
  );
  useEffect(() => {
    const element = target.current;
    if (eventSource === "native") {
      element?.addEventListener("keydown", handler);
      return () => element?.removeEventListener("keydown", handler);
    }
  }, [eventSource, handler]);
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- The test observes bubbling from the nested button; this wrapper is not an interactive control.
    <div onKeyDown={onBubble}>
      <button
        type="button"
        ref={target}
        onKeyDown={eventSource === "react" ? handler : undefined}
      >
        Navigate suggestions
      </button>
      <output aria-label="Selection">{items[selectedIndex] ?? "None"}</output>
    </div>
  );
}

describe.each(["native", "react"] as const)(
  "useSuggestionMenuKeyboardHandler (%s keyboard events)",
  (eventSource) => {
    it("navigates committed selections and accepts the focused result", async ({
      pressKey,
    }) => {
      const onItemClick = vi.fn();
      const { getByRole } = await render(
        <Harness
          eventSource={eventSource}
          items={["First", "Second", "Third"]}
          onItemClick={onItemClick}
        />,
      );
      getByRole("button", { name: "Navigate suggestions" }).element().focus();
      const selection = getByRole("status", { name: "Selection" });

      await pressKey("ArrowUp");
      await expect.element(selection).toHaveTextContent("Third");
      await pressKey("ArrowDown");
      await expect.element(selection).toHaveTextContent("First");
      await pressKey("PageDown");
      await expect.element(selection).toHaveTextContent("Third");
      await pressKey("PageUp");
      await expect.element(selection).toHaveTextContent("First");
      await pressKey("ArrowDown");
      await expect.element(selection).toHaveTextContent("Second");
      await pressKey("Enter");
      expect(onItemClick).toHaveBeenCalledExactlyOnceWith("Second");
    });

    it.for([
      { isComposing: true, keyCode: 13 },
      { isComposing: false, keyCode: 229 },
    ])(
      "leaves keyboard events with IME signal %j untouched",
      async (signal, { pressKey }) => {
        const onItemClick = vi.fn();
        const onBubble = vi.fn();
        const { getByRole } = await render(
          <Harness
            eventSource={eventSource}
            items={["First", "Second", "Third"]}
            onItemClick={onItemClick}
            onBubble={onBubble}
          />,
        );
        const target = getByRole("button", { name: "Navigate suggestions" });
        target.element().focus();
        await pressKey("ArrowDown");
        const selection = getByRole("status", { name: "Selection" });
        await expect.element(selection).toHaveTextContent("Second");
        onBubble.mockClear();

        // The event flags exercise routing, not the OS's composition UI.
        const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Enter"];
        for (const key of keys) {
          const event = new KeyboardEvent("keydown", {
            key,
            ...signal,
            bubbles: true,
            cancelable: true,
          });
          expect(event.keyCode).toBe(signal.keyCode);
          target.element().dispatchEvent(event);
          expect(event.defaultPrevented).toBe(false);
        }

        expect(onBubble).toHaveBeenCalledTimes(keys.length);
        expect(onItemClick).not.toHaveBeenCalled();
        await pressKey("Enter");
        await expect.element(selection).toHaveTextContent("Second");
        expect(onItemClick).toHaveBeenCalledExactlyOnceWith("Second");
        expect(onBubble).toHaveBeenCalledTimes(keys.length);
      },
    );

    it("leaves unrelated input alone and does not accept an empty menu", async ({
      pressKey,
    }) => {
      const onItemClick = vi.fn();
      const { getByRole } = await render(
        <Harness
          eventSource={eventSource}
          items={[]}
          onItemClick={onItemClick}
        />,
      );
      const target = getByRole("button", { name: "Navigate suggestions" });
      target.element().focus();

      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      target.element().dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      await pressKey("ArrowDown");
      await pressKey("Enter");
      await expect
        .element(getByRole("status", { name: "Selection" }))
        .toHaveTextContent("None");
      expect(onItemClick).not.toHaveBeenCalled();
    });
  },
);
