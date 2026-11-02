import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { SuggestionMenu } from "./SuggestionMenu.js";
import type { DefaultReactSuggestionItem } from "./types.js";

vi.mock("../../editor/ComponentsContext.js", () => ({
  useComponentsContext: () => ({
    SuggestionMenu: {
      Root: (props: { children: ReactNode }) => <div>{props.children}</div>,
      Item: (props: { item: DefaultReactSuggestionItem }) => (
        <div role="option">{`${props.item.title} ${props.item.subtext}`}</div>
      ),
      Label: (props: { children: ReactNode }) => <div>{props.children}</div>,
      EmptyItem: () => null,
      Loader: () => null,
    },
  }),
}));

vi.mock("../../i18n/dictionary.js", () => ({
  useDictionary: () => ({ suggestion_menu: { no_items_title: "" } }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
});

function item(
  title: string,
  subtext: string,
  group?: string,
): DefaultReactSuggestionItem {
  return { title, subtext, group, onItemClick: () => undefined };
}

async function render(items: DefaultReactSuggestionItem[]) {
  await act(async () =>
    root.render(
      <SuggestionMenu
        items={items}
        loadingState="loaded"
        selectedIndex={0}
        onItemClick={() => undefined}
      />,
    ),
  );
  return [...container.querySelectorAll("[role=option]")].map(
    (el) => el.textContent,
  );
}

it("gives items that share a title or group distinct keys", async () => {
  const consoleError = vi.spyOn(console, "error");

  expect(
    await render([
      item("image.png", "Page A", "Images"),
      item("image.png", "Page B", "Images"),
      item("logo.png", "Page A", "Logos"),
      item("image.png", "Page C", "Images"),
    ]),
  ).toEqual([
    "image.png Page A",
    "image.png Page B",
    "logo.png Page A",
    "image.png Page C",
  ]);

  const duplicateKeyWarnings = consoleError.mock.calls.filter((args) =>
    String(args[0]).includes("two children with the same key"),
  );
  expect(duplicateKeyWarnings).toEqual([]);
});
