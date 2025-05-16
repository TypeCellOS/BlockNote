import type { AIDictionary } from "../dictionary";

export const ru: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Создать контент",
      input_placeholder: "Введите запрос",
      thinking: "Обработка",
      editing: "Редактирование",
      error: "Произошла ошибка",
    },
  },
  slash_menu: {
    ai: {
      title: "Спросить ИИ",
      subtext: "Продолжить писать с помощью ИИ",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "ИИ",
    },
  },
  ai_menu: {
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
    accept: { title: "Принять", aliases: undefined },
    retry: { title: "Повторить", aliases: undefined },
    revert: { title: "Отменить", aliases: undefined },
  },
};
