import { locales } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
// import { useTranslation } from "some-i18n-library"; // You can use any i18n library you like

export default function App() {
  // const { lang } = useTranslation('common'); // You can get the current language from the i18n library or alternatively from a router
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance using a React component.
  return (
    <div dir="rtl">
      <BlockNoteView editor={editor} />
    </div>
  );
}
