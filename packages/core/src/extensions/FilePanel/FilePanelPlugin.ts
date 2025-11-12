import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

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
    showMenu(blockId: string) {
      store.setState({
        blockId,
      });
    },
  } as const;
});
