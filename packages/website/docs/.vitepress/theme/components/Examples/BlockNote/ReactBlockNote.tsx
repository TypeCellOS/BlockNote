import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";
import * as styles from "./ReactBlockNote.module.css";

export function ReactBlockNote() {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  const editor = useBlockNote({
    onUpdate: (editor) => {
      // Log the document to console on every update
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
    },
    useDarkTheme: darkMode,
  });

  useEffect(() => {
    // Create the mutation observer
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const hasDarkClass =
            document.documentElement.classList.contains("dark");
          setDarkMode(hasDarkClass);
          // TODO: how to update the editor's theme?
        }
      }
    });

    // Set the observer to watch for changes on the <html> element
    observer.observe(document.documentElement, { attributes: true });
  }, []);

  return <BlockNoteView editor={editor} />;
}
