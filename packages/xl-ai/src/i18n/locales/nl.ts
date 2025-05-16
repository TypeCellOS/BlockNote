import type { AIDictionary } from "../dictionary";

export const nl: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Inhoud genereren",
      input_placeholder: "Voer een prompt in",
      thinking: "Denken",
      editing: "Bewerken",
      error: "Er is een fout opgetreden",
    },
  },
  slash_menu: {
    ai: {
      title: "Vraag AI",
      subtext: "Schrijf verder met AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
  },
  ai_menu: {
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
    accept: { title: "Accepteren", aliases: undefined },
    retry: { title: "Opnieuw Proberen", aliases: undefined },
    revert: { title: "Terugdraaien", aliases: undefined },
  },
};
