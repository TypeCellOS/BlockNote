import { describe, expect } from "vite-plus/test";

import { SuggestionMenu } from "./SuggestionMenu.js";
import { SuggestionMenuWrapper } from "./SuggestionMenuWrapper.js";

async function getItems(query: string) {
  return query === "x"
    ? []
    : ["First", "Second", "Third"].map((title) => ({
        title,
        onItemClick: doNothing,
      }));
}

function doNothing() {}

function renderWrapper(query: string) {
  return (
    <SuggestionMenuWrapper
      query={query}
      closeMenu={doNothing}
      clearQuery={doNothing}
      getItems={getItems}
      suggestionMenuComponent={SuggestionMenu}
    />
  );
}

describe("SuggestionMenuWrapper", () => {
  it("references the active option and removes its references when closed", async ({
    setupEditor,
    page,
    pressKey,
  }) => {
    const { editor, rootNode, rerender } = await setupEditor({
      props: { slashMenu: false, emojiPicker: false },
      children: renderWrapper(""),
    });
    const editable = page.elementLocator(rootNode).getByRole("textbox");
    const menu = page.getByRole("listbox");

    async function expectActiveOption(name: string) {
      const option = menu.getByRole("option", { name, exact: true });
      await expect.element(option).toHaveAttribute("aria-selected", "true");
      expect(option.element().id).not.toBe("");
      await expect
        .poll(() => editable.element().getAttribute("aria-activedescendant"))
        .toBe(option.element().id);
    }

    await expectActiveOption("First");
    expect(menu.element().id).not.toBe("");
    await expect
      .element(editable)
      .toHaveAttribute("aria-controls", menu.element().id);

    editor.focus();
    await pressKey("PageDown");
    await expectActiveOption("Third");
    await expect.element(editable).toHaveFocus();

    rerender({ children: renderWrapper("x") });
    await expect.element(editable).not.toHaveAttribute("aria-activedescendant");
    await expect.element(menu.getByRole("option")).not.toBeInTheDocument();
    // An empty result clears the selection without unmounting the wrapper.
    await expect.element(editable).toHaveAttribute("aria-expanded", "true");

    rerender({ children: renderWrapper("") });
    await expectActiveOption("First");

    // Remove just the wrapper so the editor stays available to observe cleanup.
    rerender({ children: null });
    await expect.element(menu).not.toBeInTheDocument();
    await expect.element(editable).not.toHaveAttribute("aria-activedescendant");
    await expect.element(editable).not.toHaveAttribute("aria-controls");
    await expect.element(editable).toHaveAttribute("aria-expanded", "false");
  });
});
