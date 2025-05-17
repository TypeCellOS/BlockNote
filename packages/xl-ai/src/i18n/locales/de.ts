import type { AIDictionary } from "../dictionary";

export const de: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Mit KI bearbeiten",
    },
  },
  slash_menu: {
    ai: {
      title: "KI fragen",
      subtext: "Mit KI schreiben",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "KI",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Weiterschreiben",
      aliases: undefined,
    },
    summarize: {
      title: "Zusammenfassen",
      aliases: undefined,
    },
    add_action_items: {
      title: "Aktionspunkte hinzufügen",
      aliases: undefined,
    },
    write_anything: {
      title: "Beliebigen Text schreiben…",
      aliases: undefined,
      prompt_placeholder: "Schreiben über ",
    },
    simplify: {
      title: "Vereinfachen",
      aliases: undefined,
    },
    translate: {
      title: "Übersetzen…",
      aliases: undefined,
      prompt_placeholder: "Übersetzen in ",
    },
    fix_spelling: {
      title: "Rechtschreibung korrigieren",
      aliases: undefined,
    },
    improve_writing: {
      title: "Schreibstil verbessern",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Frage die KI was auch immer…",
    status: {
      thinking: "Denke nach…",
      editing: "Bearbeite…",
      error: "Ups! Etwas ist schiefgelaufen",
    },
    actions: {
      accept: { title: "Akzeptieren", aliases: undefined },
      retry: { title: "Wiederholen", aliases: undefined },
      cancel: { title: "Abbrechen", aliases: undefined },
      revert: { title: "Zurücksetzen", aliases: undefined },
    },
  },
};
