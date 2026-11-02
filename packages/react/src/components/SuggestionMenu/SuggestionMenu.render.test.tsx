import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { SuggestionMenu } from "./SuggestionMenu.js";
import type { DefaultReactSuggestionItem } from "./types.js";

// Defined once, so every render gets the same component types and React can
// reuse rows across renders.
const components = vi.hoisted(() => ({
  SuggestionMenu: {
    Root: (props: { children: ReactNode }) => <div>{props.children}</div>,
    Item: (props: { item: DefaultReactSuggestionItem }) => (
      <div role="option">{`${props.item.title} ${props.item.subtext}`}</div>
    ),
    Label: (props: { children: ReactNode }) => <div>{props.children}</div>,
    EmptyItem: () => null,
    Loader: () => null,
  },
}));

vi.mock("../../editor/ComponentsContext.js", () => ({
  useComponentsContext: () => components,
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

it("keeps each item's row when the list is filtered", async () => {
  await render([item("logo.png", "Page A"), item("image.png", "Page B")]);
  const imageRow = container.querySelectorAll("[role=option]")[1];

  expect(await render([item("image.png", "Page B")])).toEqual([
    "image.png Page B",
  ]);
  expect(container.querySelector("[role=option]")).toBe(imageRow);
});
