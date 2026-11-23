import type { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, vi } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { selectText as SelectText } from "../../../../../tests/src/commands/node/selectText.js";
import { LinkToolbarController } from "./LinkToolbarController.js";

function TestLinkToolbar() {
  return (
    <div role="toolbar" aria-label="Link actions">
      <button type="button">Edit link</button>
    </div>
  );
}

function toolbar() {
  return document.querySelector('[aria-label="Link actions"]');
}

async function setup(setupEditor: SetupEditor, editable: boolean) {
  const { editor } = await setupEditor({
    skin: "raw",
    props: { editable, linkToolbar: false },
    children: (
      <LinkToolbarController
        linkToolbar={TestLinkToolbar}
        floatingUIOptions={{
          useHoverProps: { delay: 0 },
          useTransitionStatusProps: { duration: 0 },
          useTransitionStylesProps: { duration: 0 },
        }}
      />
    ),
    initialContent: [
      {
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://example.com",
            content: "a link",
          },
        ],
      },
    ],
  });

  return editor;
}

function putCursorInLink(
  editor: BlockNoteEditor,
  selectText: typeof SelectText,
) {
  selectText(editor, "a").collapseToEnd();
}

describe("LinkToolbarController in a read-only editor", () => {
  it("opens the toolbar when the editor is editable", async ({
    setupEditor,
    selectText,
  }) => {
    const editor = await setup(setupEditor, true);

    putCursorInLink(editor, selectText);

    await vi.waitFor(() => expect(toolbar()).not.toBeNull());
  });

  it("does not open the toolbar when the editor is read-only", async ({
    setupEditor,
    selectText,
  }) => {
    const editor = await setup(setupEditor, false);

    putCursorInLink(editor, selectText);

    expect(toolbar()).toBeNull();
  });

  it.for([true, false])(
    "opens on pointer hover only if editable (editable: %s)",
    async (editable, { setupEditor, page, positionalMouse }) => {
      await setup(setupEditor, editable);
      const link = page.getByRole("link", { name: "a link", exact: true });
      await link.hover();
      const box = link.element().getBoundingClientRect();
      // The first entry discovers the anchor. Move within it as a real mouse
      // would after Floating UI attaches its hover listeners.
      await positionalMouse({
        type: "move",
        x: box.left + box.width / 4,
        y: box.top + box.height / 2,
      });
      expect(link.element().matches(":hover")).toBe(true);
      const actions = page.getByRole("toolbar", { name: "Link actions" });
      if (editable) {
        await expect.element(actions).toBeVisible();
      } else {
        await expect.element(actions).not.toBeInTheDocument();
      }
    },
  );

  it("closes the toolbar when the editor becomes read-only", async ({
    setupEditor,
    selectText,
  }) => {
    const editor = await setup(setupEditor, true);
    putCursorInLink(editor, selectText);
    await vi.waitFor(() => expect(toolbar()).not.toBeNull());

    editor.isEditable = false;

    await vi.waitFor(() => expect(toolbar()).toBeNull());
  });
});
