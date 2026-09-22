import { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteViewRaw } from "../../editor/BlockNoteView.js";
import { LinkToolbarController } from "./LinkToolbarController.js";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLElement | undefined;

async function render(element: ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(element));
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

function TestLinkToolbar() {
  return <div className="bn-link-toolbar" />;
}

function toolbar() {
  return document.querySelector(".bn-link-toolbar");
}

async function setup(editable: boolean) {
  const editor = BlockNoteEditor.create({
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

  await render(
    <BlockNoteViewRaw editor={editor} editable={editable} linkToolbar={false}>
      <LinkToolbarController linkToolbar={TestLinkToolbar} />
    </BlockNoteViewRaw>,
  );

  return editor;
}

async function putCursorInLink(editor: BlockNoteEditor) {
  let linkPos: number | undefined;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (linkPos === undefined && node.isText && node.marks.length > 0) {
      linkPos = pos + 1;
    }
    return linkPos === undefined;
  });
  if (linkPos === undefined) {
    throw new Error("Expected the fixture to contain a link");
  }
  const position = linkPos;

  await act(async () => {
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, position)),
    );
  });
}

describe("LinkToolbarController in a read-only editor", () => {
  it("opens the toolbar when the editor is editable", async () => {
    const editor = await setup(true);

    await putCursorInLink(editor);

    await vi.waitFor(() => expect(toolbar()).not.toBeNull());
  });

  it("does not open the toolbar when the editor is read-only", async () => {
    const editor = await setup(false);

    await putCursorInLink(editor);

    expect(toolbar()).toBeNull();
  });

  it("ignores a hovered link when the editor is read-only", async () => {
    const editor = await setup(false);
    const link = editor.domElement?.querySelector("a");
    if (!link) {
      throw new Error("Expected the rendered editor to contain a link");
    }

    link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(toolbar()).toBeNull();
  });

  it("closes the toolbar when the editor becomes read-only", async () => {
    const editor = await setup(true);
    await putCursorInLink(editor);
    await vi.waitFor(() => expect(toolbar()).not.toBeNull());

    await act(async () => {
      editor.isEditable = false;
    });

    await vi.waitFor(() => expect(toolbar()).toBeNull());
  });
});
