import { Derived } from "@tanstack/store";
import {
  createExtension,
  createStore,
} from "../../editor/managers/extensions/types.js";
import { Plugin } from "@tiptap/pm/state";

export const FilePanelExtension = createExtension((editor) => {
  const store = createStore({
    blockId: undefined as string | undefined,
    referencePos: null as DOMRect | null,
  });

  function closeMenu() {
    store.setState({
      blockId: undefined,
      referencePos: null,
    });
  }

  // reset the menu when the document changes (non-remote)
  editor.onChange((_e, { getChanges }) => {
    if (getChanges().some((change) => change.source.type === "yjs-remote")) {
      return;
    }
    // If the changes are not from remote, we should close the menu
    closeMenu();
  });

  // reset the menu when the selection changes
  editor.onSelectionChange(closeMenu);

  const isShown = new Derived({
    fn: () => !!store.state.blockId,
    deps: [store],
  });

  isShown.mount();

  return {
    key: "filePanel",
    store,
    isShown,
    closeMenu,
    plugins: [
      // TODO annoying to have to do this here
      new Plugin({
        props: {
          handleKeyDown: (_view, event: KeyboardEvent) => {
            if (event.key === "Escape" && isShown.state) {
              closeMenu();
              return true;
            }
            return false;
          },
        },
      }),
    ],
    showMenu(blockId: string) {
      const referencePos = editor.getBlockClientRect(blockId);
      if (!referencePos) {
        // TODO should we do something here? Wait a tick?
        return;
      }
      store.setState({
        blockId,
        referencePos,
      });
    },
    init({ dom, root, abortController }) {
      dom.addEventListener("mousedown", closeMenu, {
        signal: abortController.signal,
      });
      dom.addEventListener("dragstart", closeMenu, {
        signal: abortController.signal,
      });

      root.addEventListener(
        "scroll",
        () => {
          const blockId = store.state.blockId;
          if (blockId) {
            // Show the menu again, to update it's position
            this.showMenu(blockId);
          }
        },
        {
          // Setting capture=true ensures that any parent container of the editor that
          // gets scrolled will trigger the scroll event. Scroll events do not bubble
          // and so won't propagate to the document by default.
          capture: true,
          signal: abortController.signal,
        },
      );
    },
  };
});
