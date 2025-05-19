import type { AIDictionary } from "../dictionary";

export const ru: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Редактировать с помощью ИИ",
    },
  },
  slash_menu: {
    ai: {
      title: "Спросить ИИ",
      subtext: "Писать с помощью ИИ",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "ИИ",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Продолжить написание",
      aliases: undefined,
    },
    summarize: {
      title: "Резюмировать",
      aliases: undefined,
    },
    add_action_items: {
      title: "Добавить пункты действий",
      aliases: undefined,
    },
    write_anything: {
      title: "Написать что угодно…",
      aliases: undefined,
      prompt_placeholder: "Написать о ",
    },
    simplify: {
      title: "Упростить",
      aliases: undefined,
    },
    translate: {
      title: "Перевести…",
      aliases: undefined,
      prompt_placeholder: "Перевести на ",
    },
    fix_spelling: {
      title: "Исправить орфографию",
      aliases: undefined,
    },
    improve_writing: {
      title: "Улучшить текст",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Спросите ИИ о чем угодно…",
    status: {
      thinking: "Думаю…",
      editing: "Редактирую…",
      error: "Упс! Что-то пошло не так",
    },
    actions: {
      accept: { title: "Принять", aliases: undefined },
      retry: { title: "Повторить", aliases: undefined },
      cancel: { title: "Отменить", aliases: undefined },
      revert: { title: "Отменить", aliases: undefined },
    },
  },
};
