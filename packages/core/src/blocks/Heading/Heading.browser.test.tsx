import {
  BlockNoteSchema,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { browserName } from "../../../../../tests/src/utils/context.js";
import type { ReactNode } from "react";
import {
  expect,
  describe,
  afterEach,
  vi,
  type TestContext,
} from "vite-plus/test";

import "../../style.css";

const headingId = "read-only-toggle-heading";
const storageKey = `toggle-${headingId}`;
const otherHeadingId = "other-heading";
const otherStorageKey = `toggle-${otherHeadingId}`;

function seedToggleStorage(
  onTestFinished: TestContext["onTestFinished"],
  value: string | null = null,
  key = storageKey,
) {
  function write(value: string | null) {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }

  const previous = localStorage.getItem(key);
  onTestFinished(() => write(previous));
  write(value);
}

function emptyHeadingDocument(): PartialBlock[] {
  return [
    {
      id: headingId,
      type: "heading",
      props: { level: 2, isToggleable: true },
      content: "Details",
    },
  ];
}

const toggleHeadingDocument: PartialBlock[] = [
  {
    id: headingId,
    type: "heading",
    props: { level: 2, isToggleable: true },
    content: "Details",
    children: [{ type: "paragraph", content: "Nested read-only content" }],
  },
];

function outside({ children }: { children: ReactNode }) {
  return (
    <>
      <button type="button">Before editor</button>
      {children}
      <button type="button">After editor</button>
    </>
  );
}

// Editing-keymap, indentation, drag/drop, and heading-conversion shortcut
// regressions shared with toggle lists remain in ToggleWrapper/toggleBlocks.browser.test.ts.
// This suite owns heading/frame rendering, editor/storage integration, and controls.
describe("Heading", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("unit", () => {
    it("updates Add block when editability changes", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished, "true");
      const { editor, rerender } = await setupEditor({
        initialContent: emptyHeadingDocument(),
        props: { formattingToolbar: false, sideMenu: false },
      });
      const add = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.add_block_button,
        exact: true,
      });
      await expect.element(add).toBeVisible();
      rerender({ editable: false });
      await expect.element(add).not.toBeInTheDocument();
      rerender({ editable: true });
      await expect.element(add).toBeVisible();
    });

    it.for([true, false])(
      "shows and hides children in editable=%s mode without replacing the heading",
      async (editable, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished);
        const { editor } = await setupEditor({
          mountType: "dom",
          initialContent: toggleHeadingDocument,
        });
        editor.isEditable = editable;
        const heading = page.getByRole("heading", {
          name: "Details",
          exact: true,
        });
        const original = heading.element();
        const child = page.getByText("Nested read-only content", {
          exact: true,
        });
        const toggle = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        });
        await expect.element(child).not.toBeVisible();
        await toggle.click();
        await expect.element(child).toBeVisible();
        await toggle.click();
        await expect.element(child).not.toBeVisible();
        expect(heading.element()).toBe(original);
      },
    );

    it.for([true, false])(
      "renders Add block only for an open empty editable heading (editable=%s)",
      async (editable, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished);
        const { editor } = await setupEditor({
          mountType: "dom",
          initialContent: emptyHeadingDocument(),
        });
        editor.isEditable = editable;
        const toggle = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        });
        const add = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.add_block_button,
          exact: true,
        });
        await expect.element(add).not.toBeInTheDocument();
        await toggle.click();
        await expect.element(add).toHaveLength(editable ? 1 : 0);
        await toggle.click();
        await expect.element(add).not.toBeInTheDocument();
        await toggle.click();
        await expect.element(add).toHaveLength(editable ? 1 : 0);
      },
    );

    it("updates the empty placeholder as children are added, replaced, and removed", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished, "true");
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: emptyHeadingDocument(),
      });
      const add = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.add_block_button,
        exact: true,
      });
      const original = add.element();
      editor.updateBlock(headingId, { content: "Renamed" });
      await expect.element(add).toHaveLength(1);
      expect(add.element()).toBe(original);
      editor.updateBlock(headingId, {
        children: [{ id: "child", type: "paragraph", content: "First child" }],
      });
      await expect.element(add).not.toBeInTheDocument();
      await expect
        .element(page.getByText("First child", { exact: true }))
        .toBeVisible();
      editor.updateBlock(headingId, {
        children: [
          {
            id: "replacement",
            type: "paragraph",
            content: "Replacement child",
          },
        ],
      });
      await expect
        .element(page.getByText("Replacement child", { exact: true }))
        .toBeVisible();
      editor.removeBlocks(["replacement"]);
      await expect.element(add).toHaveLength(1);
      await expect.element(add).toBeVisible();
    });

    it.for([true, false])(
      "removes the toggle frame when converted to a regular heading (open=%s)",
      async (open, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished, String(open));
        const { editor } = await setupEditor({
          mountType: "dom",
          initialContent: toggleHeadingDocument,
        });
        const toggle = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        });
        await expect
          .element(toggle)
          .toHaveAttribute("aria-expanded", String(open));
        editor.updateBlock(headingId, { props: { isToggleable: false } });
        await expect.element(toggle).not.toBeInTheDocument();
        await expect
          .element(
            page.getByRole("heading", {
              name: "Details",
              level: 2,
              exact: true,
            }),
          )
          .toBeVisible();
        await expect
          .element(page.getByText("Nested read-only content", { exact: true }))
          .toBeVisible();
        editor.updateBlock(headingId, { props: { isToggleable: true } });
        await expect.element(toggle).toBeVisible();
      },
    );

    it.for([1, 2, 3, 4, 5, 6] as const)(
      "renders a toggle heading at level %s",
      async (level, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished);
        const { editor } = await setupEditor({
          initialContent: [
            {
              id: headingId,
              type: "heading",
              props: { level, isToggleable: true },
              content: "Details",
            },
          ],
          props: { editable: false },
        });

        await expect
          .element(
            page.getByRole("heading", {
              name: "Details",
              exact: true,
              level,
            }),
          )
          .toBeVisible();
        await expect
          .element(
            page.getByRole("button", {
              name: editor.dictionary.toggle_blocks.toggle_button,
              exact: true,
            }),
          )
          .toBeVisible();
      },
    );

    it("renders a regular heading without a toggle control", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            type: "heading",
            props: { level: 2, isToggleable: false },
            content: "Details",
          },
        ],
        props: { editable: false },
      });

      await expect
        .element(
          page.getByRole("heading", {
            name: "Details",
            exact: true,
            level: 2,
          }),
        )
        .toBeVisible();
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.toggle_button,
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
    });

    it("omits toggle controls when toggle headings are disabled in the schema", async ({
      setupEditor,
      page,
    }) => {
      const schema = BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          heading: createHeadingBlockSpec({ allowToggleHeadings: false }),
        },
      });
      const { editor } = await setupEditor({
        schema,
        initialContent: [
          {
            type: "heading",
            props: { level: 2 },
            content: "Details",
          },
        ],
        props: { editable: false },
      });

      await expect
        .element(
          page.getByRole("heading", {
            name: "Details",
            exact: true,
            level: 2,
          }),
        )
        .toBeVisible();
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.toggle_button,
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
    });
  });

  describe("integration", () => {
    it.for([true, false])(
      "restores an empty open heading with editable=%s",
      async (editable, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished, "true");
        const { editor } = await setupEditor({
          initialContent: emptyHeadingDocument(),
          props: { editable, formattingToolbar: false, sideMenu: false },
        });
        await expect
          .element(
            page.getByRole("button", {
              name: editor.dictionary.toggle_blocks.toggle_button,
              exact: true,
            }),
          )
          .toHaveAttribute("aria-expanded", "true");
        const add = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.add_block_button,
          exact: true,
        });
        if (editable) {
          await expect.element(add).toBeVisible();
        } else {
          await expect.element(add).not.toBeInTheDocument();
        }
        expect(localStorage.getItem(storageKey)).toBe("true");
      },
    );

    it("keeps a collapsed toggle closed when its children are removed", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: toggleHeadingDocument,
      });
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      editor.removeBlocks(editor.getBlock(headingId)!.children);
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.toggle_button,
            exact: true,
          }),
        )
        .toHaveAttribute("aria-expanded", "false");
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.add_block_button,
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
      expect(setItem).not.toHaveBeenCalled();
    });

    it.for([null, "false", "true", "invalid"])(
      "reads stored state %s on creation",
      async (saved, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished, saved);
        const { editor } = await setupEditor({
          initialContent: toggleHeadingDocument,
          props: { editable: false },
        });
        const toggle = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        });
        await expect
          .element(toggle)
          .toHaveAttribute("aria-expanded", String(saved === "true"));
        expect(localStorage.getItem(storageKey)).toBe(saved);
      },
    );

    it.for([true, false])(
      "preserves open=%s through view rerenders, block updates, and a fresh editor",
      async (open, { onTestFinished, setupEditor, page }) => {
        seedToggleStorage(onTestFinished);
        const { editor, rerender } = await setupEditor({
          initialContent: toggleHeadingDocument,
          props: { editable: false },
        });
        const first = page.getByRole("textbox").nth(0);
        const toggle = first.getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        });
        await toggle.click();
        if (!open) {
          await toggle.click();
        }
        rerender({ theme: "dark" });
        await expect
          .element(toggle)
          .toHaveAttribute("aria-expanded", String(open));
        editor.updateBlock(headingId, {
          props: { level: 3 },
          content: "Renamed",
        });
        await expect
          .element(
            first.getByRole("heading", {
              name: "Renamed",
              level: 3,
              exact: true,
            }),
          )
          .toBeVisible();
        await expect
          .element(toggle)
          .toHaveAttribute("aria-expanded", String(open));
        expect(localStorage.getItem(storageKey)).toBe(String(open));
        // A separate editor reads the saved state rather than retaining the frame's closure.
        const { editor: recreated } = await setupEditor({
          initialContent: editor.document,
          props: { editable: false },
        });
        expect(recreated).not.toBe(editor);
        const restored = page.getByRole("textbox").nth(1);
        await expect
          .element(
            restored.getByRole("button", {
              name: editor.dictionary.toggle_blocks.toggle_button,
              exact: true,
            }),
          )
          .toHaveAttribute("aria-expanded", String(open));
        const child = restored.getByText("Nested read-only content", {
          exact: true,
        });
        if (open) {
          await expect.element(child).toBeVisible();
        } else {
          await expect.element(child).not.toBeVisible();
        }
      },
    );

    it("keeps toggle states independent by block id", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished);
      seedToggleStorage(onTestFinished, "true", otherStorageKey);
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [
          ...emptyHeadingDocument(),
          {
            id: otherHeadingId,
            type: "heading",
            props: { isToggleable: true },
            content: "Other",
          },
        ],
      });
      editor.isEditable = false;
      const toggles = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      await expect
        .element(toggles.nth(0))
        .toHaveAttribute("aria-expanded", "false");
      await expect
        .element(toggles.nth(1))
        .toHaveAttribute("aria-expanded", "true");
      await toggles.nth(0).click();
      expect(localStorage.getItem(storageKey)).toBe("true");
      expect(localStorage.getItem(otherStorageKey)).toBe("true");
      await toggles.nth(1).click();
      expect(localStorage.getItem(otherStorageKey)).toBe("false");
      expect(localStorage.getItem(storageKey)).toBe("true");
      await expect
        .element(toggles.nth(0))
        .toHaveAttribute("aria-expanded", "true");
    });

    it("opens and saves state when children are added, without rewriting it on unrelated updates or removals", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: emptyHeadingDocument(),
      });
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      const toggle = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      editor.updateBlock(headingId, {
        children: [
          { id: "one", type: "paragraph", content: "One" },
          { id: "two", type: "paragraph", content: "Two" },
        ],
      });
      await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
      expect(setItem).toHaveBeenCalledExactlyOnceWith(storageKey, "true");
      setItem.mockClear();
      editor.updateBlock(headingId, { content: "Renamed" });
      editor.removeBlocks(["one"]);
      await expect
        .element(page.getByText("Two", { exact: true }))
        .toBeVisible();
      editor.removeBlocks(["two"]);
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.add_block_button,
            exact: true,
          }),
        )
        .toBeVisible();
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorage.getItem(storageKey)).toBe("true");
    });

    it("adds one empty default child, preserves neighboring content, and moves the caret into it", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished, "true");
      const { editor } = await setupEditor({
        initialContent: [
          ...emptyHeadingDocument(),
          { id: "neighbor", type: "paragraph", content: "Neighbor" },
        ],
        props: { formattingToolbar: false, sideMenu: false },
      });
      const before = editor.document;
      const add = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.add_block_button,
        exact: true,
      });
      await add.click();
      const children = editor.getBlock(headingId)!.children;
      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        type: "paragraph",
        content: [],
        children: [],
      });
      expect(editor.document).toEqual([
        { ...before[0], children },
        ...before.slice(1),
      ]);
      expect(editor.getTextCursorPosition().block.id).toBe(children[0].id);
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      await expect.element(add).not.toBeInTheDocument();
    });

    it("preserves editor selection and document when clicking the toggle", async ({
      onTestFinished,
      setupEditor,
      page,
      selectText,
      compareDocuments,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        initialContent: [
          ...toggleHeadingDocument,
          { id: "neighbor", type: "paragraph", content: "Selected text" },
        ],
        props: { formattingToolbar: false, sideMenu: false },
      });
      editor.focus();
      selectText(editor, "Selected text");
      const before = editor.document;
      const toggle = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      await toggle.click();
      expect(editor.getSelectedText()).toBe("Selected text");
      await toggle.click();
      expect(editor.getSelectedText()).toBe("Selected text");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      expect(compareDocuments(before, editor.document)).toBe("(no changes)");
    });

    it("persists expansion without changing the read-only document", async ({
      onTestFinished,
      setupEditor,
      page,
      compareDocuments,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: toggleHeadingDocument,
      });
      editor.isEditable = false;
      const before = editor.document;
      const toggleButton = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      const nestedContent = page.getByText("Nested read-only content", {
        exact: true,
      });
      await expect.element(nestedContent).not.toBeVisible();
      expect(localStorage.getItem(storageKey)).toBeNull();

      await toggleButton.click();
      await expect.element(nestedContent).toBeVisible();
      expect(localStorage.getItem(storageKey)).toBe("true");
      expect(compareDocuments(before, editor.document)).toBe("(no changes)");

      await toggleButton.click();
      await expect.element(nestedContent).not.toBeVisible();
      expect(localStorage.getItem(storageKey)).toBe("false");
      expect(compareDocuments(before, editor.document)).toBe("(no changes)");
    });
  });

  describe("aria", () => {
    it("exposes Add block only while the empty toggle is expanded", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        initialContent: emptyHeadingDocument(),
        props: { formattingToolbar: false, sideMenu: false },
      });
      const toggle = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      await toggle.click();
      await expect.element(page.getByRole("textbox"))
        .toMatchAriaInlineSnapshot(`
        - textbox:
          - button "Expand or collapse" [expanded]
          - heading "Details" [level=2]
          - button "Empty toggle. Click to add a block."
      `);
      await toggle.click();
      await expect.element(page.getByRole("textbox"))
        .toMatchAriaInlineSnapshot(`
        - textbox:
          - button "Expand or collapse"
          - heading "Details" [level=2]
      `);
    });

    it("exposes the heading and expanded state while hiding collapsed children", async ({
      onTestFinished,
      setupEditor,
      page,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor: blockNoteEditor } = await setupEditor({
        initialContent: toggleHeadingDocument,
        props: { editable: false, theme: "light" },
      });
      const toggleButton = page.getByRole("button", {
        name: blockNoteEditor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      const editor = page.getByRole("textbox");
      await expect.element(editor).toMatchAriaInlineSnapshot(`
        - textbox:
          - button "Expand or collapse"
          - heading "Details" [level=2]
      `);
      await toggleButton.click();
      await expect.element(editor).toMatchAriaInlineSnapshot(`
        - textbox:
          - button "Expand or collapse" [expanded]
          - heading "Details" [level=2]
          - paragraph: Nested read-only content
      `);
      await toggleButton.click();
      await expect.element(editor).toMatchAriaInlineSnapshot(`
        - textbox:
          - button "Expand or collapse"
          - heading "Details" [level=2]
      `);
    });
  });

  describe("axe", () => {
    it("checks the editable empty toggle with its Add block action", async ({
      onTestFinished,
      setupEditor,
      page,
      runAxe,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        initialContent: emptyHeadingDocument(),
        domAttributes: { editor: { "aria-label": "Document" } },
        props: { formattingToolbar: false, sideMenu: false },
      });
      const textbox = page.getByRole("textbox");
      await expect.element(textbox).toBeVisible();
      expect((await runAxe(textbox)).violations).toEqual([]);
      await page
        .getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        })
        .click();
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.add_block_button,
            exact: true,
          }),
        )
        .toBeVisible();
      // Known issue: Add block has no minimum height (Block.css), so its
      // target is under 24px in Chromium/Firefox. Match only this failure;
      // additional violations must fail. WebKit meets the threshold.
      // https://dequeuniversity.com/rules/axe/4.13/target-size
      const { violations } = await runAxe(textbox);
      expect(violations).toMatchObject(
        browserName === "webkit"
          ? []
          : [
              {
                id: "target-size",
                nodes: [
                  {
                    target: [".bn-toggle-add-block-button"],
                    all: [],
                    none: [],
                    any: [
                      {
                        id: "target-size",
                        data: {
                          height: browserName === "chromium" ? 20 : 23,
                          minSize: 24,
                        },
                        relatedNodes: [],
                      },
                      {
                        id: "target-offset",
                        data: {
                          closestOffset: browserName === "chromium" ? 20 : 23,
                          minOffset: 24,
                        },
                        relatedNodes: [{ target: [".tiptap"] }],
                      },
                    ],
                  },
                ],
              },
            ],
      );
    });

    it("checks collapsed and expanded read-only headings", async ({
      onTestFinished,
      setupEditor,
      page,
      runAxe,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        // Supply the host editor name so this scan tests the heading content.
        domAttributes: { editor: { "aria-label": "Document" } },
        initialContent: toggleHeadingDocument,
        props: { editable: false, theme: "light" },
      });
      const textbox = page.getByRole("textbox");
      await expect.element(textbox).toBeVisible();
      expect((await runAxe(textbox)).violations).toEqual([]);

      await page
        .getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        })
        .click();
      await expect
        .element(page.getByText("Nested read-only content", { exact: true }))
        .toBeVisible();
      expect((await runAxe(textbox)).violations).toEqual([]);
    });
  });

  describe("keyboard", () => {
    it("tabs forward and backward through Add block with a visible focus ring and allows leaving", async ({
      onTestFinished,
      setupEditor,
      page,
      pressKey,
      captureFocusOutline,
    }) => {
      seedToggleStorage(onTestFinished);
      const { editor } = await setupEditor({
        initialContent: emptyHeadingDocument(),
        props: { formattingToolbar: false, sideMenu: false },
        outside,
      });
      const toggle = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.toggle_button,
        exact: true,
      });
      // Entry from editable text is still undefined (the skipped test below).
      // Start on the toggle to exercise its existing sibling navigation.
      await toggle.click();
      toggle.element().focus();
      await expect.element(toggle).toHaveFocus();
      const add = page.getByRole("button", {
        name: editor.dictionary.toggle_blocks.add_block_button,
        exact: true,
      });
      await expect.element(add).toBeVisible();
      const compareOutline = captureFocusOutline(add);
      await pressKey("Tab");
      await expect.element(add).toHaveFocus();
      await compareOutline();
      await pressKey("Shift+Tab");
      await expect.element(toggle).toHaveFocus();
      await pressKey("Tab");
      await expect.element(add).toHaveFocus();
      await pressKey("Tab");
      await expect
        .element(
          page.getByRole("button", { name: "After editor", exact: true }),
        )
        .toHaveFocus();
      await pressKey("Shift+Tab");
      await expect.element(add).toHaveFocus();
      await compareOutline();
    });

    for (const key of ["Enter", "Space"]) {
      // Firefox routes Enter on the focused button into editable text instead
      // of adding a child. Remove fails once editor key handling is fixed.
      it(
        `activates Add block with ${key} and returns to editing its child`,
        {
          fails: browserName === "firefox" && key === "Enter",
        },
        async ({ onTestFinished, setupEditor, page, pressKey }) => {
          seedToggleStorage(onTestFinished);
          const { editor } = await setupEditor({
            initialContent: emptyHeadingDocument(),
            props: { formattingToolbar: false, sideMenu: false },
            outside,
          });
          const toggle = page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.toggle_button,
            exact: true,
          });
          // Entry from editable text is still undefined (the skipped test below).
          // Start on the toggle to exercise its existing sibling navigation.
          await toggle.click();
          toggle.element().focus();
          await expect.element(toggle).toHaveFocus();
          const add = page.getByRole("button", {
            name: editor.dictionary.toggle_blocks.add_block_button,
            exact: true,
          });
          await expect.element(add).toBeVisible();
          await pressKey("Tab");
          await expect.element(add).toHaveFocus();
          await pressKey(key);
          const children = editor.getBlock(headingId)!.children;
          expect(children).toHaveLength(1);
          expect(editor.getTextCursorPosition().block.id).toBe(children[0].id);
          await expect.element(page.getByRole("textbox")).toHaveFocus();
          await expect.element(add).not.toBeInTheDocument();
          await pressKey("x");
          expect(editor.getBlock(children[0])!.content).toEqual([
            { type: "text", text: "x", styles: {} },
          ]);
        },
      );
    }

    // Toggle headings represent interactive blocks in this accessibility vertical slice.
    // Keyboard access to toggle controls from within an editable block is not implemented.
    it.skip("editable toggle heading: toggle is keyboard accessible while the editor has focus", async () => {
      // TODO: The keyboard interaction for controls within an editable editor is TBD.
      // Reach the toggle while the editor has focus, expand/collapse its children,
      // and return to editing without changing the document content.
      // In editable mode, skip the toggle in page tab navigation outside the editor;
      // in read-only mode it must remain a regular tab stop (tested below).
      // Capture its focus indicator and announcements of its name, role and expanded state.
      // A direct toggle shortcut alone would not require a full browser test;
      // this placeholder covers the eventual keyboard focus/navigation behavior.
    });

    it.for(["Enter", "Space"])(
      "read-only toggle heading: Tab navigation and visible focus after %s",
      async (
        key,
        {
          onTestFinished,
          setupEditor,
          page,
          focusUntil,
          pressKey,
          captureFocusOutline,
          compareDocuments,
        },
      ) => {
        seedToggleStorage(onTestFinished);
        const { editor } = await setupEditor({
          initialContent: toggleHeadingDocument,
          props: { editable: false, theme: "light" },
          outside,
        });
        const before = editor.document;
        page
          .getByRole("button", { name: "Before editor", exact: true })
          .element()
          .focus();
        const toggleButton = page.getByRole("button", {
          name: editor.dictionary.toggle_blocks.toggle_button,
          exact: true,
        });
        await expect.element(toggleButton).toBeVisible();
        const compareFocusOutline = captureFocusOutline(toggleButton);
        await focusUntil(toggleButton);
        await expect.element(toggleButton).toHaveFocus();
        await compareFocusOutline(toggleButton);

        await pressKey(key);
        await expect.element(toggleButton).toHaveFocus();
        await compareFocusOutline(toggleButton);
        await expect
          .element(toggleButton)
          .toHaveAttribute("aria-expanded", "true");
        expect(compareDocuments(before, editor.document)).toBe("(no changes)");
        await pressKey(key);
        await expect.element(toggleButton).toHaveFocus();
        await compareFocusOutline(toggleButton);

        await expect
          .element(toggleButton)
          .toHaveAttribute("aria-expanded", "false");
        expect(compareDocuments(before, editor.document)).toBe("(no changes)");

        await pressKey("Tab");
        await expect
          .element(
            page.getByRole("button", { name: "After editor", exact: true }),
          )
          .toHaveFocus();
        await pressKey("Shift+Tab");
        await expect.element(toggleButton).toHaveFocus();
        await compareFocusOutline(toggleButton);
      },
    );
  });
});
