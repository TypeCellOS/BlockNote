import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { GridSuggestionMenuWrapper } from "./GridSuggestionMenu/GridSuggestionMenuWrapper.js";
import { SuggestionMenuWrapper } from "./SuggestionMenuWrapper.js";

const mocks = vi.hoisted(() => ({
  selectedIndex: undefined as number | undefined,
  setContentEditableProps: vi.fn(),
}));

vi.mock("../../editor/BlockNoteContext.js", () => ({
  useBlockNoteContext: () => ({
    setContentEditableProps: mocks.setContentEditableProps,
  }),
}));

vi.mock("../../hooks/useBlockNoteEditor.js", () => ({
  useBlockNoteEditor: () => ({}),
}));

vi.mock("./hooks/useLoadSuggestionMenuItems.js", () => ({
  useLoadSuggestionMenuItems: () => ({
    items: ["first", "second", "third"],
    usedQuery: "",
    loadingState: "loaded",
  }),
}));

vi.mock("./hooks/useCloseSuggestionMenuNoItems.js", () => ({
  useCloseSuggestionMenuNoItems: () => undefined,
}));

vi.mock("./hooks/useSuggestionMenuKeyboardNavigation.js", () => ({
  useSuggestionMenuKeyboardNavigation: () => ({
    selectedIndex: mocks.selectedIndex,
  }),
}));

vi.mock(
  "./GridSuggestionMenu/hooks/useGridSuggestionMenuKeyboardNavigation.js",
  () => ({
    useGridSuggestionMenuKeyboardNavigation: () => ({
      selectedIndex: mocks.selectedIndex,
    }),
  }),
);

type ContentEditableProps = {
  "aria-activedescendant"?: string;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
};

let container: HTMLDivElement;
let root: Root;
let contentEditableProps: ContentEditableProps;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  contentEditableProps = {};
  mocks.selectedIndex = undefined;
  mocks.setContentEditableProps.mockImplementation(
    (update: (props: ContentEditableProps) => ContentEditableProps) => {
      contentEditableProps = update(contentEditableProps);
    },
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.removeChild(container);
  vi.clearAllMocks();
});

function Menu() {
  return null;
}

function renderWrapper(type: "list" | "grid") {
  const commonProps = {
    query: "",
    closeMenu: vi.fn(),
    clearQuery: vi.fn(),
    getItems: async () => ["first", "second", "third"],
  };

  return act(async () => {
    root.render(
      type === "list" ? (
        <SuggestionMenuWrapper
          {...commonProps}
          suggestionMenuComponent={Menu}
        />
      ) : (
        <GridSuggestionMenuWrapper
          {...commonProps}
          columns={2}
          gridSuggestionMenuComponent={Menu}
        />
      ),
    );
  });
}

describe.each(["list", "grid"] as const)(
  "%s suggestion menu wrapper",
  (type) => {
    it("updates and clears aria-activedescendant", async () => {
      mocks.selectedIndex = 0;
      await renderWrapper(type);
      expect(contentEditableProps["aria-activedescendant"]).toBe(
        "bn-suggestion-menu-item-0",
      );

      mocks.selectedIndex = 2;
      await renderWrapper(type);
      expect(contentEditableProps["aria-activedescendant"]).toBe(
        "bn-suggestion-menu-item-2",
      );

      mocks.selectedIndex = undefined;
      await renderWrapper(type);
      expect(contentEditableProps["aria-activedescendant"]).toBeUndefined();

      mocks.selectedIndex = 0;
      await renderWrapper(type);
      await act(async () => root.unmount());
      expect(contentEditableProps["aria-activedescendant"]).toBeUndefined();
    });
  },
);
