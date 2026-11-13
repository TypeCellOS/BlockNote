import "@blocknote/core/fonts/inter.css";
import { ar, fa, he } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { DirectionProvider } from "@mantine/core";
import { useState } from "react";

const languages = [
  {
    code: "he",
    label: "עברית — Hebrew",
    dictionary: he,
    greeting: "שלום",
    introduction: "עורך מימין לשמאל",
    list: "רשימה עם פריטים מקוננים",
    nested: "פריט פנימי",
    firstStep: "שלב ראשון",
    secondStep: "שלב שני",
    task: "משימה לבדיקה",
    quote: "ציטוט קצר",
    details: "פרטים נוספים",
    detail: "אפשר לערוך גם כאן.",
    link: "תיעוד BlockNote",
  },
  {
    code: "ar",
    label: "العربية — Arabic",
    dictionary: ar,
    greeting: "مرحباً",
    introduction: "محرر من اليمين إلى اليسار",
    list: "قائمة بعناصر متداخلة",
    nested: "بند فرعي",
    firstStep: "الخطوة الأولى",
    secondStep: "الخطوة الثانية",
    task: "مهمة للتجربة",
    quote: "اقتباس قصير",
    details: "تفاصيل إضافية",
    detail: "يمكنك الكتابة هنا أيضاً.",
    link: "توثيق BlockNote",
  },
  {
    code: "fa",
    label: "فارسی — Persian",
    dictionary: fa,
    greeting: "سلام",
    introduction: "ویرایشگر راست به چپ",
    list: "فهرست با موارد تو در تو",
    nested: "مورد داخلی",
    firstStep: "مرحله اول",
    secondStep: "مرحله دوم",
    task: "یک کار برای آزمایش",
    quote: "یک نقل قول کوتاه",
    details: "جزئیات بیشتر",
    detail: "اینجا هم می‌توانید بنویسید.",
    link: "مستندات BlockNote",
  },
];

function Editor({ language }: { language: (typeof languages)[number] }) {
  const editor = useCreateBlockNote({
    dictionary: language.dictionary,
    initialContent: [
      {
        type: "heading",
        props: { level: 2 },
        content: language.greeting,
      },
      {
        type: "paragraph",
        content: language.introduction,
      },
      {
        type: "paragraph",
        content: `${language.greeting} — English (123) — עברית / العربية / فارسی`,
      },
      {
        type: "bulletListItem",
        content: language.list,
        children: [
          { type: "bulletListItem", content: language.nested },
          {
            type: "bulletListItem",
            content: "English inside an RTL list (456)",
          },
        ],
      },
      { type: "numberedListItem", content: language.firstStep },
      { type: "numberedListItem", content: language.secondStep },
      { type: "checkListItem", content: language.task },
      { type: "quote", content: language.quote },
      {
        type: "toggleListItem",
        content: language.details,
        children: [
          {
            type: "paragraph",
            content: language.detail,
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.blocknotejs.org",
            content: language.link,
          },
        ],
      },
      {
        type: "codeBlock",
        content: `const greeting = "${language.greeting}";`,
      },
      { type: "paragraph" },
    ],
  });

  return <BlockNoteView editor={editor} dir="rtl" lang={language.code} />;
}

export default function App() {
  const [language, setLanguage] = useState(languages[0]);

  // Keep Mantine's direction context and the editor's DOM direction in sync,
  // without detecting or changing the surrounding playground's direction.
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <label>
          Editor language:{" "}
          <select
            value={language.code}
            onChange={(event) => {
              const selected = languages.find(
                (language) => language.code === event.target.value,
              );
              if (selected) {
                setLanguage(selected);
              }
            }}
          >
            {languages.map((language) => (
              <option
                key={language.code}
                value={language.code}
                lang={language.code}
              >
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <p>Changing language resets the example content.</p>
      </div>
      <DirectionProvider initialDirection="rtl" detectDirection={false}>
        <Editor key={language.code} language={language} />
      </DirectionProvider>
    </>
  );
}
