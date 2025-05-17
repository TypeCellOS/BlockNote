import type { AIDictionary } from "../dictionary";

export const uk: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Редагувати за допомогою ШІ",
    },
  },
  slash_menu: {
    ai: {
      title: "Запитати ШІ",
      subtext: "Писати за допомогою ШІ",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "ШІ",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Продовжити написання",
      aliases: undefined,
    },
    summarize: {
      title: "Підсумувати",
      aliases: undefined,
    },
    add_action_items: {
      title: "Додати пункти дій",
      aliases: undefined,
    },
    write_anything: {
      title: "Написати що завгодно…",
      aliases: undefined,
      prompt_placeholder: "Написати про ",
    },
    simplify: {
      title: "Спростити",
      aliases: undefined,
    },
    translate: {
      title: "Перекласти…",
      aliases: undefined,
      prompt_placeholder: "Перекласти на ",
    },
    fix_spelling: {
      title: "Виправити орфографію",
      aliases: undefined,
    },
    improve_writing: {
      title: "Покращити текст",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Запитайте ШІ про що завгодно…",
    status: {
      thinking: "Думаю…",
      editing: "Редагую…",
      error: "На жаль! Щось пішло не так",
    },
    actions: {
      accept: { title: "Прийняти", aliases: undefined },
      retry: { title: "Повторити", aliases: undefined },
      cancel: { title: "Скасувати", aliases: undefined },
      revert: { title: "Повернути", aliases: undefined },
    },
  },
};
