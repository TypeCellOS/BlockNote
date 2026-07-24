import {
  BlockNoteEditor,
  SideMenuExtension,
  SuggestionMenu,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import { useEffect, useRef } from "react";

import "./styles.css";

// Creates a simple button element, used for the side menu below.
function createButton(text: string, onClick?: () => void) {
  const element = document.createElement("a");
  element.className = "side-menu-button";
  element.href = "#";
  element.text = text;

  if (onClick) {
    element.addEventListener("click", (e) => {
      onClick();
      e.preventDefault();
    });
  }

  return element;
}

// Since this example doesn't use `@blocknote/react`, we can't use the built-in
// UI components. Instead, we create a plain BlockNote editor using the vanilla
// JS API and mount it manually, then wire up our own Side Menu.
function initEditor(rootElement: HTMLElement) {
  const editor = BlockNoteEditor.create();

  // `editor.mount` turns the element it's given into the editable area, so we
  // mount into a dedicated child element. This keeps our custom UI elements
  // (like the Side Menu below) separate from the editor's content.
  const editorElement = document.createElement("div");
  rootElement.appendChild(editorElement);
  editor.mount(editorElement);

  const sideMenu = editor.getExtension(SideMenuExtension)!;

  let element: HTMLElement;

  // The Side Menu extension exposes a store which holds its state (visibility,
  // position, and the block it's attached to). We subscribe to it to update
  // our custom element whenever the state changes.
  const unsubscribe = sideMenu.store.subscribe(() => {
    const sideMenuState = sideMenu.store.state;

    // The store's initial state is `undefined`, so we wait until the side menu
    // has a block to attach to.
    if (!sideMenuState) {
      return;
    }

    // We create the element the first time the side menu is shown, and reuse it
    // afterwards. Since the element is only created once, its event handlers
    // read the block to act on from the store, so they always use the block the
    // side menu is currently attached to.
    if (!element) {
      element = document.createElement("div");
      element.className = "side-menu";
      element.style.position = "fixed";
      const addBtn = createButton("+", () => {
        const block = sideMenu.store.state?.block;
        if (!block) {
          return;
        }

        const blockContent = block.content;
        const isBlockEmpty =
          blockContent !== undefined &&
          Array.isArray(blockContent) &&
          blockContent.length === 0;

        if (isBlockEmpty) {
          editor.setTextCursorPosition(block);
          editor.getExtension(SuggestionMenu)?.openSuggestionMenu("/");
        } else {
          const insertedBlock = editor.insertBlocks(
            [{ type: "paragraph" }],
            block,
            "after",
          )[0];
          editor.setTextCursorPosition(insertedBlock);
          editor.getExtension(SuggestionMenu)?.openSuggestionMenu("/");
        }
      });
      element.appendChild(addBtn);

      const dragBtn = createButton("::", () => {
        // Intentionally empty - dragging is handled by the drag events below.
      });

      dragBtn.addEventListener("dragstart", (evt) => {
        const block = sideMenu.store.state?.block;
        if (block) {
          sideMenu.blockDragStart(evt, block);
        }
      });
      dragBtn.addEventListener("dragend", () => sideMenu.blockDragEnd());
      dragBtn.draggable = true;
      element.style.display = "none";
      element.appendChild(dragBtn);

      // The Side Menu is appended to the root element rather than the editor
      // element, so that the editor doesn't treat it as content.
      rootElement.appendChild(element);
    }

    if (sideMenuState.show) {
      element.style.display = "flex";

      element.style.top = sideMenuState.referencePos.top + "px";
      element.style.left =
        sideMenuState.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });

  return () => {
    unsubscribe();
    editor.unmount();
  };
}

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    return initEditor(rootRef.current);
  }, []);

  return <div ref={rootRef} />;
}
