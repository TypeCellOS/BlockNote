import { PartialBlock } from "@blocknote/core";
import { BlockNoteView, createBlockNoteEditor } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useEffect, useMemo, useState } from "react";

async function saveToStorage(jsonBlocks: any[]) {
  // Save contents to local storage. You might want to debounce this or replace with a call to your API / database
  localStorage.setItem("editorContent", JSON.stringify(jsonBlocks));
}

async function loadFromStorage() {
  // Gets the previously stored editor contents
  const storageString = localStorage.getItem("editorContent");
  return storageString
    ? (JSON.parse(storageString) as PartialBlock[])
    : undefined;
}

export default function App() {
  const [initialContent, setInitialContent] = useState<
    PartialBlock[] | undefined | "loading"
  >("loading");

  // Loads the previously stored editor contents
  useEffect(() => {
    loadFromStorage().then((content) => {
      setInitialContent(content);
    });
  }, []);

  // Creates a new editor instance.
  // We use useMemo + createBlockNoteEditor instead of useBlockNote so we can delay the creation of the editor until the initial content is loaded.
  const editor = useMemo(() => {
    if (initialContent === "loading") {
      return undefined;
    }
    return createBlockNoteEditor({ initialContent });
  }, [initialContent]);

  if (editor === undefined) {
    return "Loading content...";
  }

  // Renders the editor instance.
  return (
    <BlockNoteView
      editor={editor}
      onChange={(editor) => {
        saveToStorage(editor.topLevelBlocks);
      }}
    />
  );
}
