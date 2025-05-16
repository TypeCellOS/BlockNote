import type { AIDictionary } from "../dictionary";

export const pl: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generuj treść",
      input_placeholder: "Wprowadź polecenie",
      thinking: "Myślę",
      editing: "Edytuję",
      error: "Wystąpił błąd",
    },
  },
  slash_menu: {
    ai: {
      title: "Zapytaj AI",
      subtext: "Kontynuuj pisanie z AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
  },
  ai_menu: {
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
    accept: { title: "Akceptuj", aliases: undefined },
    retry: { title: "Spróbuj Ponownie", aliases: undefined },
    revert: { title: "Przywróć", aliases: undefined },
  },
};
