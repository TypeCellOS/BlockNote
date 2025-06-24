import type { AIDictionary } from "../dictionary";

export const he: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "ערוך עם AI",
    },
  },
  slash_menu: {
    ai: {
      title: "שאול AI",
      subtext: "כתוב עם AI",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "AI",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "המשך לכתוב",
      aliases: undefined,
    },
    summarize: {
      title: "סכם",
      aliases: undefined,
    },
    add_action_items: {
      title: "הוסף פעולות",
      aliases: undefined,
    },
    write_anything: {
      title: "כתוב כלום…",
      aliases: undefined,
      prompt_placeholder: "כתוב על ",
    },
    simplify: {
      title: "פשט",
      aliases: undefined,
    },
    translate: {
      title: "תרגם…",
      aliases: undefined,
      prompt_placeholder: "תרגם ל ",
    },
    fix_spelling: {
      title: "תיקן כתיבה",
      aliases: undefined,
    },
    improve_writing: {
      title: "שפר כתיבה",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "שאול AI כלום…",
    status: {
      thinking: "חושב…",
      editing: "ערך…",
      error: "אופס! משהו השתבש",
    },
    actions: {
      accept: { title: "אישור", aliases: undefined },
      retry: { title: "נסה שוב", aliases: undefined },
      cancel: { title: "בטל", aliases: undefined },
      revert: { title: "בטל", aliases: undefined },
    },
  },
};
