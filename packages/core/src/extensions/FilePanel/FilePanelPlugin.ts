import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";
import { Plugin } from "@tiptap/pm/state";

export const FilePanelPlugin = createExtension((editor) => {
  const store = createStore({
    blockId: undefined as string | undefined,
  });

  function closeMenu() {
    store.setState({
      blockId: undefined,
    });
  }

  // reset the menu when the document changes
  editor.onChange(
    closeMenu,
    // don't trigger the callback if the changes are caused by a remote user
    false,
  );

  // reset the menu when the selection changes
  editor.onSelectionChange(closeMenu);

  return {
    key: "filePanel",
    store,
    closeMenu,
    plugins: [
      // TODO annoying to have to do this here
      new Plugin({
        props: {
          handleKeyDown: (_view, event: KeyboardEvent) => {
            if (event.key === "Escape" && store.state.blockId) {
              closeMenu();
              return true;
            }
            return false;
          },
        },
      }),
    ],
    showMenu(blockId: string) {
      store.setState({
        blockId,
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
            // TODO does this need to be here? Doesn't floating ui handle this?
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
  } as const;
});
