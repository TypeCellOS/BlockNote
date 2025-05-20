import type { AIDictionary } from "../dictionary";

export const no: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Rediger med AI",
    },
  },
  slash_menu: {
    ai: {
      title: "Spør AI",
      subtext: "Skriv med AI",
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
      title: "Fortsett å skrive",
      aliases: undefined,
    },
    summarize: {
      title: "Oppsummer",
      aliases: undefined,
    },
    add_action_items: {
      title: "Legg til handlingspunkter",
      aliases: undefined,
    },
    write_anything: {
      title: "Skriv hva som helst…",
      aliases: undefined,
      prompt_placeholder: "Skriv om ",
    },
    simplify: {
      title: "Forenkle",
      aliases: undefined,
    },
    translate: {
      title: "Oversett…",
      aliases: undefined,
      prompt_placeholder: "Oversett til ",
    },
    fix_spelling: {
      title: "Rett stavefeil",
      aliases: undefined,
    },
    improve_writing: {
      title: "Forbedre skriving",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Spør AI om hva som helst…",
    status: {
      thinking: "Tenker…",
      editing: "Redigerer…",
      error: "Ups! Noe gikk galt",
    },
    actions: {
      accept: { title: "Godta", aliases: undefined },
      retry: { title: "Prøv igjen", aliases: undefined },
      cancel: { title: "Avbryt", aliases: undefined },
      revert: { title: "Tilbakestill", aliases: undefined },
    },
  },
};
