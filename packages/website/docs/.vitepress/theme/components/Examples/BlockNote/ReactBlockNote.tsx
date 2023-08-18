import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import { useEffect, useMemo } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import * as styles from "./ReactBlockNote.module.css";

const colors = [
  "#958DF1",
  "#F98181",
  "#FBBC88",
  "#FAF594",
  "#70CFF8",
  "#94FADB",
  "#B9F18D",
];
const names = [
  "Lorem Ipsumovich",
  "Typy McTypeface",
  "Collabo Rative",
  "Edito Von Editz",
  "Wordsworth Writywrite",
  "Docu D. Mentor",
  "Scrivener Scribblesworth",
  "Digi Penman",
  "Ernest Wordway",
  "Sir Typalot",
  "Comic Sans-Serif",
  "Miss Spellcheck",
  "Bullet Liston",
  "Autonomy Backspace",
  "Ctrl Zedson",
];

const getRandomElement = (list: any[]) =>
  list[Math.floor(Math.random() * list.length)];

const getRandomColor = () => getRandomElement(colors);
const getRandomName = () => getRandomElement(names);

export function ReactBlockNote(props: { theme: "light" | "dark" }) {
  const [doc, provider] = useMemo(() => {
    console.log("create");
    const doc = new Y.Doc();
    const provider = new YPartyKitProvider(
      "blocknote.yousefed.partykit.dev",
      "homepage-1",
      doc
    );
    return [doc, provider];
  }, []);

  const editor = useBlockNote(
    {
      domAttributes: {
        editor: {
          class: styles.editor,
        },
      },
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: {
          name: getRandomName(),
          color: getRandomColor(),
        },
      },
    },
    [props.theme]
  );

  useEffect(() => {
    let shownAlert = false;
    const listener = () => {
      if (!shownAlert) {
        alert(
          "Text you enter in this demo is displayed publicly on the internet to show multiplayer features. Be kind :)"
        );
        shownAlert = true;
      }
    };
    editor?.domElement?.addEventListener("focus", listener);
    return () => {
      editor?.domElement?.removeEventListener("focus", listener);
    };
  }, [editor?.domElement]);

  return <BlockNoteView editor={editor} theme={props.theme} />;
}
