import type { AIDictionary } from "../dictionary";

export const pl: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Edytuj z AI",
    },
  },
  slash_menu: {
    ai: {
      title: "Zapytaj AI",
      subtext: "Pisz z AI",
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
      title: "Kontynuuj Pisanie",
      aliases: undefined,
    },
    summarize: {
      title: "Podsumuj",
      aliases: undefined,
    },
    add_action_items: {
      title: "Dodaj Elementy Działań",
      aliases: undefined,
    },
    write_anything: {
      title: "Napisz Cokolwiek…",
      aliases: undefined,
      prompt_placeholder: "Napisz o ",
    },
    simplify: {
      title: "Uprość",
      aliases: undefined,
    },
    translate: {
      title: "Przetłumacz…",
      aliases: undefined,
      prompt_placeholder: "Przetłumacz na ",
    },
    fix_spelling: {
      title: "Popraw Pisownię",
      aliases: undefined,
    },
    improve_writing: {
      title: "Popraw Styl Pisania",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Zapytaj AI o cokolwiek…",
    status: {
      thinking: "Myślę…",
      editing: "Edytuję…",
      error: "Ups! Coś poszło nie tak",
    },
    actions: {
      accept: { title: "Akceptuj", aliases: undefined },
      retry: { title: "Spróbuj Ponownie", aliases: undefined },
      cancel: { title: "Anuluj", aliases: undefined },
      revert: { title: "Przywróć", aliases: undefined },
    },
  },
};
