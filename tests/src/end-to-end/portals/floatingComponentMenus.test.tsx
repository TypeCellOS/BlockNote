import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView as AriakitBlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import { BlockNoteView as MantineBlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { PortalElementsMap, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView as ShadCNBlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { ComponentType, useEffect } from "react";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

// The menus and popovers a floating component opens (here: the formatting
// toolbar's block type menu) render inside that component's wrapper, next to
// the component, not in the editor container. These tests pin what that buys
// the user: the menu hides together with its toolbar, it travels with the
// toolbar when `portalElements` relocates it, and the toolbar still fades out
// showing its content. They run per skin because each skin brings its own
// menu implementation, and Mantine's would hide its menu on its own
// (`hideDetached`) while Ariakit's and shadcn's would stay orphaned on screen.

type ViewProps = {
  editor: BlockNoteEditor;
  portalElements?: PortalElementsMap;
};

const skins: { name: string; View: ComponentType<ViewProps> }[] = [
  {
    name: "mantine",
    View: (props) => <MantineBlockNoteView {...props} />,
  },
  {
    name: "ariakit",
    View: (props) => <AriakitBlockNoteView {...props} />,
  },
  {
    name: "shadcn",
    View: (props) => <ShadCNBlockNoteView {...props} />,
  },
];

function ScrollingEditor(props: {
  View: ComponentType<ViewProps>;
  portalElements?: PortalElementsMap;
  onEditor: (editor: BlockNoteEditor) => void;
}) {
  const editor = useCreateBlockNote({
    initialContent: Array.from({ length: 12 }, (_, i) => ({
      type: "paragraph" as const,
      content: `Paragraph ${i}`,
    })),
  });

  useEffect(() => {
    props.onEditor(editor);
  }, [editor, props]);

  // A short scroll container, so a selection can be scrolled out of view.
  return (
    <div data-test="scroller" style={{ height: 160, overflow: "auto" }}>
      <props.View editor={editor} portalElements={props.portalElements} />
    </div>
  );
}

async function renderEditor(props: {
  View: ComponentType<ViewProps>;
  portalElements?: PortalElementsMap;
}) {
  let editor: BlockNoteEditor | undefined;

  await render(
    <ScrollingEditor
      {...props}
      onEditor={(value) => {
        editor = value;
      }}
    />,
  );
  await waitForSelector(".bn-editor");
  await vi.waitFor(() => {
    if (!editor) {
      throw new Error("Editor was not created");
    }
  });

  if (!editor) {
    throw new Error("Editor was not created");
  }

  return editor;
}

function createPortalTarget(id: string) {
  const target = document.createElement("div");
  target.id = id;
  target.dataset.testPortalTarget = "";
  document.body.append(target);
  return target;
}

/** Selects text in the first paragraph, which shows the formatting toolbar. */
async function showFormattingToolbar(editor: BlockNoteEditor) {
  editor.focus();
  editor._tiptapEditor.commands.setTextSelection({ from: 3, to: 12 });
  return waitForSelector(".bn-formatting-toolbar");
}

/**
 * Opens the block type menu from the toolbar's first control. Ariakit and
 * shadcn render the menu as a listbox, Mantine as a menu.
 */
async function openBlockTypeMenu(toolbar: HTMLElement) {
  await userEvent.click(toolbar.querySelector("button, [role=combobox]")!);
  return waitForSelector("[role=menu], [role=listbox]");
}

function isVisible(element: Element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

afterEach(() => {
  document
    .querySelectorAll<HTMLElement>("[data-test-portal-target]")
    .forEach((target) => target.remove());
});

describe.each(skins)(
  "Menus opened from a floating component ($name)",
  ({ View }) => {
    test("render next to the component, inside its wrapper", async () => {
      const editor = await renderEditor({ View });
      const toolbar = await showFormattingToolbar(editor);
      const menu = await openBlockTypeMenu(toolbar);

      const wrapper = toolbar.parentElement!;
      expect(wrapper.contains(menu)).toBe(true);
      expect(toolbar.contains(menu)).toBe(false);
    });

    test("hide when the component hides", async () => {
      const editor = await renderEditor({ View });
      const toolbar = await showFormattingToolbar(editor);
      const menu = await openBlockTypeMenu(toolbar);
      expect(isVisible(menu)).toBe(true);

      // Scroll the selection out of view: the toolbar's reference is hidden, so
      // its wrapper gets `visibility: hidden`, and the menu must go with it.
      const scroller = document.querySelector<HTMLElement>(
        "[data-test=scroller]",
      )!;
      scroller.scrollTop = scroller.scrollHeight;
      scroller.dispatchEvent(new Event("scroll"));

      await vi.waitFor(() => {
        expect(getComputedStyle(toolbar.parentElement!).visibility).toBe(
          "hidden",
        );
      });
      expect(isVisible(menu)).toBe(false);
    });

    test("follow the component when portalElements relocates it", async () => {
      const target = createPortalTarget("portal-target");
      const editor = await renderEditor({
        View,
        portalElements: { default: target },
      });
      const toolbar = await showFormattingToolbar(editor);
      const menu = await openBlockTypeMenu(toolbar);

      expect(target.contains(toolbar)).toBe(true);
      expect(target.contains(menu)).toBe(true);
      expect(document.querySelector(".bn-container")!.contains(menu)).toBe(
        false,
      );
    });
  },
);

describe("A floating component that closes", () => {
  test("still shows its content while fading out", async () => {
    const editor = await renderEditor({ View: skins[0].View });
    const toolbar = await showFormattingToolbar(editor);

    // Collapse the selection: the live toolbar is replaced by a snapshot that
    // fades out, and that snapshot must still show the toolbar.
    editor._tiptapEditor.commands.setTextSelection(3);
    await vi.waitFor(() => {
      expect(document.querySelector(".bn-formatting-toolbar")).not.toBe(
        toolbar,
      );
    });
    expect(document.querySelector(".bn-formatting-toolbar")).not.toBeNull();

    await vi.waitFor(() => {
      expect(document.querySelector(".bn-formatting-toolbar")).toBeNull();
    });
  });
});
