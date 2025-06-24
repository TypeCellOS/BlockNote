import type { AIDictionary } from "../dictionary";

export const nl: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Bewerken met AI",
    },
  },
  slash_menu: {
    ai: {
      title: "Vraag AI",
      subtext: "Schrijf met AI",
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
      title: "Schrijven Voortzetten",
      aliases: undefined,
    },
    summarize: {
      title: "Samenvatten",
      aliases: undefined,
    },
    add_action_items: {
      title: "Actiepunten Toevoegen",
      aliases: undefined,
    },
    write_anything: {
      title: "Schrijf Iets…",
      aliases: undefined,
      prompt_placeholder: "Schrijf over ",
    },
    simplify: {
      title: "Vereenvoudigen",
      aliases: undefined,
    },
    translate: {
      title: "Vertalen…",
      aliases: undefined,
      prompt_placeholder: "Vertaal naar ",
    },
    fix_spelling: {
      title: "Spelling Corrigeren",
      aliases: undefined,
    },
    improve_writing: {
      title: "Schrijven Verbeteren",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Vraag AI iets…",
    status: {
      thinking: "Denken…",
      editing: "Bewerken…",
      error: "Oeps! Er is iets misgegaan",
    },
    actions: {
      accept: { title: "Accepteren", aliases: undefined },
      retry: { title: "Opnieuw Proberen", aliases: undefined },
      cancel: { title: "Annuleren", aliases: undefined },
      revert: { title: "Terugdraaien", aliases: undefined },
    },
  },
};
