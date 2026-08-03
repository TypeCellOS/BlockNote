import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useState } from "react";

// Every dictionary exported by `@blocknote/core/locales`, keyed by its
// language code (the same key used in the export, e.g. `zhTW`).
const dictionaries = locales as Record<string, (typeof locales)["en"]>;

// Human-readable names shown in the language picker.
const languageNames: Record<string, string> = {
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
};

const languageKeys = Object.keys(dictionaries).sort((a, b) =>
  (languageNames[a] ?? a).localeCompare(languageNames[b] ?? b),
);

// Creates the editor with the given dictionary. This is a separate component so
// that changing its `key` (see below) re-mounts it, re-creating the editor
// instance with the newly selected language.
function LocalizedEditor(props: { dictionary: (typeof locales)["en"] }) {
  const editor = useCreateBlockNote({ dictionary: props.dictionary });

  return <BlockNoteView editor={editor} />;
}

export default function App() {
  // The currently selected language.
  const [language, setLanguage] = useState<keyof typeof dictionaries>("en");

  return (
    <div>
      <label>
        Language:{" "}
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {languageKeys.map((key) => (
            <option key={key} value={key}>
              {languageNames[key] ?? key}
            </option>
          ))}
        </select>
      </label>

      {/* Keying the editor by the language re-mounts it whenever the selection
          changes, so the editor picks up the newly selected dictionary. */}
      <LocalizedEditor key={language} dictionary={dictionaries[language]} />
    </div>
  );
}
