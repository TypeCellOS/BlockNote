import { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

// This is a component that is similar to https://github.com/ueberdosis/tiptap/blob/main/packages/react/src/useEditor.ts
// Use it to rerender a component whenever a transaction happens in the editor
export const useEditorForceUpdate = (editor: Editor) => {
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    const callback = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          forceUpdate();
        });
      });
    };

    editor.on("transaction", callback);
    return () => {
      editor.off("transaction", callback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
};
