import { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteViewRaw } from "../../editor/BlockNoteView.js";
import { SuggestionMenuPopover } from "./SuggestionMenuPopover.js";
import { SuggestionMenuController } from "./SuggestionMenuController.js";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const references = vi.hoisted(() => [] as unknown[]);

vi.mock("../Popovers/GenericPopover.js", () => ({
  GenericPopover: (props: { reference?: unknown; children?: ReactNode }) => {
    references.push(props.reference);
    return null;
  },
}));

let root: Root | undefined;
let host: HTMLElement | undefined;

// jsdom returns a rect without `toJSON`. Like a browser, the stub returns a new
// object with the same values on each call.
function stubBoundingClientRect() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => {
      const rect = new DOMRect(10, 20, 8, 16);
      return Object.assign(rect, {
        toJSON: () => ({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        }),
      });
    },
  );
}

async function render(element: ReactElement) {
  stubBoundingClientRect();
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
  references.length = 0;
  vi.restoreAllMocks();
});

async function typeQueryAfterTrigger(
  editor: BlockNoteEditor,
  triggerCharacter: string,
) {
  await act(async () => {
    editor.getExtension(SuggestionMenu)!.openSuggestionMenu(triggerCharacter, {
      deleteTriggerCharacter: true,
    });
  });
  const referencesAtOpen = references.length;
  for (const character of "query") {
    await act(async () => {
      editor.transact((tr) => tr.insertText(character));
    });
  }
  return references.slice(referencesAtOpen);
}

describe("suggestion menu reference", () => {
  it("keeps the list menu reference while the menu does not move", async () => {
    const editor = BlockNoteEditor.create();
    await render(
      <BlockNoteViewRaw editor={editor} slashMenu={false} emojiPicker={false}>
        <SuggestionMenuController triggerCharacter="/" />
      </BlockNoteViewRaw>,
    );

    const referencesWhileTyping = await typeQueryAfterTrigger(editor, "/");

    expect(referencesWhileTyping.length).toBeGreaterThan(1);
    expect(new Set(referencesWhileTyping).size).toBe(1);
  });

  it("keeps the shared emoji popover reference while the menu does not move", async () => {
    const editor = BlockNoteEditor.create();
    await render(
      <BlockNoteViewRaw editor={editor} slashMenu={false} emojiPicker={false}>
        <SuggestionMenuPopover triggerCharacter=":">
          {() => null}
        </SuggestionMenuPopover>
      </BlockNoteViewRaw>,
    );

    const referencesWhileTyping = await typeQueryAfterTrigger(editor, ":");

    expect(referencesWhileTyping.length).toBeGreaterThan(1);
    expect(new Set(referencesWhileTyping).size).toBe(1);
  });
});
