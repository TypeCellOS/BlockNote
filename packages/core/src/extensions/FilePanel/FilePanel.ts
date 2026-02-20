import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FilePanelExtension = createExtension(({ editor }) => {
  const store = createStore<string | undefined>(undefined);

  function closeMenu() {
    store.setState(undefined);
  }

  return {
    key: "filePanel",
    store,
    mount({ signal }) {
      // Reset the menu when the document changes.
      const unsubscribeOnChange = editor.onChange(
        closeMenu,
        // Don't trigger if the changes are caused by a remote user.
        false,
      );

      // reset the menu when the selection changes
      const unsubscribeOnSelectionChange = editor.onSelectionChange(
        closeMenu,
        // Don't trigger if the changes are caused by a remote user.
        false,
      );

      signal.addEventListener("abort", () => {
        unsubscribeOnChange();
        unsubscribeOnSelectionChange();
      });
    },
    closeMenu,
    showMenu(blockId: string) {
      store.setState(blockId);
    },
  } as const;
});
