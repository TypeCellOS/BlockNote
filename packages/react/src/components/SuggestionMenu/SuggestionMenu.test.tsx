import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { SuggestionMenuController } from "./SuggestionMenuController.js";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems.js";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
});

it("has good typing", () => {
  // invalid, because DefaultSuggestionItem doesn't have a title property, so the default MantineSuggestionMenu doesn't wrok
  let menu = (
    // @ts-expect-error
    <SuggestionMenuController
      getItems={async () => [{ name: "hello" }]}
      triggerCharacter="/"
    />
  );

  // valid, because getItems returns DefaultSuggestionItem so suggestionMenuComponent is optional
  menu = (
    <SuggestionMenuController
      getItems={async () => [
        {
          title: "hello",
          onItemClick: () => {
            return;
          },
        },
      ]}
      triggerCharacter="/"
    />
  );

  // validate type of onItemClick
  menu = (
    <SuggestionMenuController
      suggestionMenuComponent={undefined as any}
      getItems={async () => [{ hello: "hello" }]}
      onItemClick={() => {
        return undefined;
      }}
      triggerCharacter="/"
    />
  );

  expect(menu).toBeDefined();
});

it("keeps the suggestion menu open while an IME query is composing", async () => {
  const closeMenu = vi.fn();
  const container = document.createElement("div");

  function TestHook(props: { isComposing: boolean; usedQuery: string }) {
    useCloseSuggestionMenuNoItems(
      [],
      props.usedQuery,
      closeMenu,
      3,
      props.isComposing,
    );
    return null;
  }

  root = createRoot(container);

  await act(async () => {
    root!.render(<TestHook isComposing={true} usedQuery="nihao" />);
  });

  expect(closeMenu).not.toHaveBeenCalled();
});

it("keeps the suggestion menu open when composition ends before the committed query is loaded", async () => {
  const closeMenu = vi.fn();
  const container = document.createElement("div");

  function TestHook(props: { isComposing: boolean; usedQuery: string }) {
    useCloseSuggestionMenuNoItems(
      [],
      props.usedQuery,
      closeMenu,
      3,
      props.isComposing,
    );
    return null;
  }

  root = createRoot(container);

  await act(async () => {
    root!.render(<TestHook isComposing={true} usedQuery="nihao" />);
  });

  await act(async () => {
    root!.render(<TestHook isComposing={false} usedQuery="nihao" />);
  });

  expect(closeMenu).not.toHaveBeenCalled();
});
