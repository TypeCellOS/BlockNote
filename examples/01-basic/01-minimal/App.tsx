import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { getBlocksChangedByTransaction } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";

const MyFilterExtension = {
  plugin: new Plugin({
    filterTransaction: (transaction) => {
      const blocksChanged = getBlocksChangedByTransaction(transaction);
      console.log(blocksChanged);
      if (JSON.stringify(blocksChanged).includes("NOPE")) {
        return false;
      }
      return true;
    },
    key: new PluginKey("my-extension"),
  }),
};

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    _extensions: {
      filterExtension: MyFilterExtension,
    },
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
