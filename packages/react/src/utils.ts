import { useEffect, useState } from "react";
import { Editor } from "@tiptap/core";

export const isAppleOS = () =>
  /Mac/.test(navigator.platform) ||
  (/AppleWebKit/.test(navigator.userAgent) &&
    /Mobile\/\w+/.test(navigator.userAgent));

export function formatKeyboardShortcut(shortcut: string) {
  if (isAppleOS()) {
    return shortcut.replace("Mod", "⌘");
  } else {
    return shortcut.replace("Mod", "Ctrl");
  }
}

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
