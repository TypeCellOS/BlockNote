import type { AIDictionary } from "../dictionary";

export const ar: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "إنشاء محتوى",
      input_placeholder: "أدخل طلبًا",
      thinking: "جارِ التفكير",
      editing: "تحرير",
      error: "حدث خطأ",
    },
  },
  slash_menu: {
    ai: {
      title: "اسأل الذكاء الاصطناعي",
      subtext: "متابعة الكتابة بالذكاء الاصطناعي",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "الذكاء الاصطناعي",
    },
  },
  ai_menu: {
    continue_writing: {
      title: "متابعة الكتابة",
      aliases: undefined,
    },
    summarize: {
      title: "تلخيص",
      aliases: undefined,
    },
    add_action_items: {
      title: "إضافة عناصر إجرائية",
      aliases: undefined,
    },
    write_anything: {
      title: "اكتب أي شيء…",
      aliases: undefined,
      prompt_placeholder: "اكتب عن ",
    },
    simplify: {
      title: "تبسيط",
      aliases: undefined,
    },
    translate: {
      title: "ترجمة…",
      aliases: undefined,
      prompt_placeholder: "ترجم إلى ",
    },
    fix_spelling: {
      title: "تصحيح الإملاء",
      aliases: undefined,
    },
    improve_writing: {
      title: "تحسين الكتابة",
      aliases: undefined,
    },
    accept: { title: "قبول", aliases: undefined },
    retry: { title: "إعادة المحاولة", aliases: undefined },
    revert: { title: "استعادة", aliases: undefined },
  },
};
