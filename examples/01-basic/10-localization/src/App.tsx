import type { Block } from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useRef, useState } from "react";

type Language = keyof typeof locales;

function isLanguage(value: string): value is Language {
  return Object.hasOwn(locales, value);
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

const languageKeys = Object.keys(locales)
  .filter(isLanguage)
  .sort((a, b) => languageNames[a].localeCompare(languageNames[b]));

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  // Recreate the editor when the language changes, preserving its document.
  const document = useRef<Block[] | undefined>(undefined);
  const editor = useCreateBlockNote(
    { dictionary: locales[language], initialContent: document.current },
    [language],
  );

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

      {/* Remount the UI so menus also reset to the new language. */}
      <BlockNoteView
        key={language}
        editor={editor}
        onChange={() => {
          document.current = editor.document;
        }}
      />
    </div>
  );
}
