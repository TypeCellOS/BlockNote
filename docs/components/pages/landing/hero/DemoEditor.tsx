import {
  BlockNoteSchema,
  combineByGroup,
  filterSuggestionItems,
  locales,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import "@blocknote/mantine/style.css";
import { useCallback, useMemo, useState } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

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

function getUTCDateYYYYMMDD() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // January is 0
  const day = now.getUTCDate();

  // Add leading zeros to month and day if needed
  const formattedMonth = month < 10 ? `0${month}` : `${month}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;

  return `${year}${formattedMonth}${formattedDay}`;
}

export default function DemoEditor(props: { theme?: "light" | "dark" }) {
  const [doc, provider] = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new YPartyKitProvider(
      "blocknote.yousefed.partykit.dev",
      // "127.0.0.1:1999", // (dev server)
      "homepage-" + getUTCDateYYYYMMDD(),
      doc,
    );
    return [doc, provider];
  }, []);

  const editor = useCreateBlockNote(
    {
      dictionary: {
        ...locales.en,
        multi_column: multiColumnLocales.en,
      },
      schema: withMultiColumn(BlockNoteSchema.create()),
      dropCursor: multiColumnDropCursor,
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: {
          name: getRandomName(),
          color: getRandomColor(),
        },
      },
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    },
    [],
  );

  const [warningShown, setWarningShown] = useState(false);

  const focus = useCallback(() => {
    if (!warningShown) {
      alert(
        "Text you enter in this demo is displayed publicly on the internet to show multiplayer features. Be kind :)",
      );
      setWarningShown(true);
    }
  }, [warningShown]);

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor),
        ),
        query,
      );
  }, [editor]);

  return (
    <BlockNoteView
      onFocus={focus}
      editor={editor}
      theme={props.theme}
      slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={getSlashMenuItems}
      />
    </BlockNoteView>
  );
}
