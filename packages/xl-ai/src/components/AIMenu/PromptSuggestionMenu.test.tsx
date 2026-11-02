import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { PromptSuggestionMenu } from "./PromptSuggestionMenu.js";

// Defined once, so every render gets the same component types and React can
// reuse rows across renders.
const components = vi.hoisted(() => ({
  Generic: {
    Form: {
      Root: (props: { children: ReactNode }) => <form>{props.children}</form>,
      TextInput: () => <input />,
    },
  },
  SuggestionMenu: {
    Root: (props: { children: ReactNode }) => <div>{props.children}</div>,
    Item: (props: { item: { title: string; subtext?: string } }) => (
      <div role="option">{`${props.item.title} ${props.item.subtext}`}</div>
    ),
  },
}));

vi.mock("@blocknote/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@blocknote/react")>()),
  useComponentsContext: () => components,
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

const items = [
  { key: "first", title: "Translate", subtext: "French", aliases: ["fr"] },
  { key: "second", title: "Translate", subtext: "German", aliases: ["de"] },
].map((item) => ({ ...item, onItemClick: () => undefined }));

async function render(promptText: string, menuItems: typeof items = items) {
  await act(async () =>
    root.render(
      <PromptSuggestionMenu
        items={menuItems}
        promptText={promptText}
        onManualPromptSubmit={() => undefined}
      />,
    ),
  );
  return [...container.querySelectorAll("[role=option]")];
}

it("keeps an item's row by its key when an item with the same title is filtered out", async () => {
  const [, germanRow] = await render("");

  const rows = await render("de");

  expect(rows.map((row) => row.textContent)).toEqual(["Translate German"]);
  expect(rows[0]).toBe(germanRow);
});

it("gives items that share a key distinct row keys", async () => {
  const consoleError = vi.spyOn(console, "error");
  const [french] = items;

  const rows = await render("", [
    french,
    { ...french, title: "Translate to French (formal)" },
  ]);

  expect(rows.map((row) => row.textContent)).toEqual([
    "Translate French",
    "Translate to French (formal) French",
  ]);
  const duplicateKeyWarnings = consoleError.mock.calls.filter((args) =>
    String(args[0]).includes("two children with the same key"),
  );
  expect(duplicateKeyWarnings).toEqual([]);
});
