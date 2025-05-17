import type { AIDictionary } from "../dictionary";

export const ar: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "تحرير بالذكاء الاصطناعي",
    },
  },
  slash_menu: {
    ai: {
      title: "اسأل الذكاء الاصطناعي",
      subtext: "الكتابة بالذكاء الاصطناعي",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "الذكاء الاصطناعي",
    },
  },
  ai_default_commands: {
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
  },
  ai_menu: {
    input_placeholder: "اسأل الذكاء الاصطناعي أي شيء…",
    status: {
      thinking: "جاري التفكير…",
      editing: "جاري التحرير…",
      error: "عذراً! حدث خطأ ما",
    },
    actions: {
      accept: { title: "قبول", aliases: undefined },
      retry: { title: "إعادة المحاولة", aliases: undefined },
      cancel: { title: "إلغاء", aliases: undefined },
      revert: { title: "استعادة", aliases: undefined },
    },
  },
};
