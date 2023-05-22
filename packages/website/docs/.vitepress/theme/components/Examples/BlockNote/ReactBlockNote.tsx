import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import * as styles from "./ReactBlockNote.module.css";

export function ReactBlockNote() {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  const doc = new Y.Doc();
  const provider = new YPartyKitProvider("localhost:1999", "my-room", doc);

  const editor = useBlockNote({
    editorDOMAttributes: {
      class: styles.editor,
    },
    theme: darkMode ? "dark" : "light",
    collaboration: {
      provider,
      fragment: doc.getXmlFragment("blocknote"),
      user: {
        name: "User",
        color: "red",
      },
    },
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
