import "@blocknote/core/fonts/inter.css";
import { he } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { DirectionProvider } from "@mantine/core";

export default function App() {
  const editor = useCreateBlockNote({
    dictionary: he,
    initialContent: [
      {
        type: "heading",
        props: { level: 2 },
        content: "שלום — مرحباً",
      },
      {
        type: "paragraph",
        content: "עורך מימין לשמאל — محرر من اليمين إلى اليسار",
      },
      {
        type: "paragraph",
        content: "עברית, العربية ו-English (123) — טקסט מעורב / نص مختلط.",
      },
      {
        type: "bulletListItem",
        content: "רשימה עם פריטים מקוננים",
        children: [
          { type: "bulletListItem", content: "פריט פנימי — بند فرعي" },
          {
            type: "bulletListItem",
            content: "English inside an RTL list (456)",
          },
        ],
      },
      { type: "numberedListItem", content: "الخطوة الأولى — שלב ראשון" },
      { type: "numberedListItem", content: "الخطوة الثانية — שלב שני" },
      { type: "checkListItem", content: "משימה לבדיקה — مهمة للتجربة" },
      { type: "quote", content: "اقتباس قصير — ציטוט קצר" },
      {
        type: "toggleListItem",
        content: "פרטים נוספים — تفاصيل إضافية",
        children: [
          {
            type: "paragraph",
            content: "אפשר לערוך גם כאן — يمكنك الكتابة هنا أيضاً.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "קישור לדוגמה — ", styles: {} },
          {
            type: "link",
            href: "https://www.blocknotejs.org",
            content: "توثيق BlockNote",
          },
        ],
      },
      { type: "codeBlock", content: 'const greeting = "שלום — مرحباً";' },
      { type: "paragraph" },
    ],
  });

  // Keep Mantine's direction context and the editor's DOM direction in sync,
  // without detecting or changing the surrounding playground's direction.
  return (
    <DirectionProvider initialDirection="rtl" detectDirection={false}>
      <BlockNoteView editor={editor} dir="rtl" lang="he" />
    </DirectionProvider>
  );
}
