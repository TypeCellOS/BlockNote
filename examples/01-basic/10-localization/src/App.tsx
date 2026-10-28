import type { Block, Dictionary } from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useRef, useState } from "react";

// Every dictionary exported by `@blocknote/core/locales`, keyed by its
// language code (the same key used in the export, e.g. `zhTW`).
const dictionaries = locales;
type Language = keyof typeof dictionaries;

function isLanguage(value: string): value is Language {
  return Object.hasOwn(dictionaries, value);
}

// Human-readable names shown in the language picker.
const languageNames = {
  ar: "العربية",
  de: "Deutsch",
  en: "English",
  es: "Español",
  fa: "فارسی",
  fr: "Français",
  he: "עברית",
  hr: "Hrvatski",
  is: "Íslenska",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  nl: "Nederlands",
  no: "Norsk",
  pl: "Polski",
  pt: "Português",
  ru: "Русский",
  sk: "Slovenčina",
  tr: "Türkçe",
  uk: "Українська",
  uz: "Oʻzbekcha",
  vi: "Tiếng Việt",
  zh: "简体中文",
  zhTW: "繁體中文",
} satisfies Record<Language, string>;

const languageKeys = Object.keys(dictionaries)
  .filter(isLanguage)
  .sort((a, b) => languageNames[a].localeCompare(languageNames[b]));

// Creates the editor with the given dictionary. This is a separate component so
// that changing its `key` (see below) re-mounts it, re-creating the editor
// instance with the newly selected language.
function LocalizedEditor(props: {
  dictionary: Dictionary;
  initialContent: Block[] | undefined;
  onChange: (document: Block[]) => void;
}) {
  const editor = useCreateBlockNote({
    dictionary: props.dictionary,
    initialContent: props.initialContent,
  });

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => props.onChange(editor.document)}
    />
  );
}

export default function App() {
  // The currently selected language.
  const [language, setLanguage] = useState<Language>("en");
  // Keep the document outside the keyed component so language changes do not
  // discard edits. A ref avoids re-rendering this component on every keystroke.
  const document = useRef<Block[] | undefined>(undefined);

  return (
    <div>
      <label>
        Language:{" "}
        <select
          value={language}
          onChange={(event) => {
            if (isLanguage(event.target.value)) {
              setLanguage(event.target.value);
            }
          }}
        >
          {languageKeys.map((key) => (
            <option key={key} value={key}>
              {languageNames[key]}
            </option>
          ))}
        </select>
      </label>

      {/* Keying the editor by the language re-mounts it whenever the selection
          changes, so the editor picks up the newly selected dictionary. */}
      <LocalizedEditor
        key={language}
        dictionary={dictionaries[language]}
        initialContent={document.current}
        onChange={(content) => {
          document.current = content;
        }}
      />
    </div>
  );
}
