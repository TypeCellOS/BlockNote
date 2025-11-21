import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FilePanel = createExtension((editor) => {
  const store = createStore({
    blockId: undefined as string | undefined,
  });

  function closeMenu() {
    store.setState({
      blockId: undefined,
    });
  }

  return {
    key: "filePanel",
    store,
    mount({ signal }) {
      // reset the menu when the document changes
      const unsubscribeOnChange = editor.onChange(
        closeMenu,
        // don't trigger the callback if the changes are caused by a remote user
        false,
      );

      // reset the menu when the selection changes
      const unsubscribeOnSelectionChange = editor.onSelectionChange(closeMenu);

      signal.addEventListener("abort", () => {
        unsubscribeOnChange();
        unsubscribeOnSelectionChange();
      });
    },
    closeMenu,
    showMenu(blockId: string) {
      store.setState({
        blockId,
      });
    },
  } as const;
});
