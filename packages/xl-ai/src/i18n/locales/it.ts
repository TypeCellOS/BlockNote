import type { AIDictionary } from "../dictionary";

export const it: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Modifica con IA",
    },
  },
  slash_menu: {
    ai: {
      title: "Chiedi all'IA",
      subtext: "Scrivi con IA",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "IA",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Continua a scrivere",
      aliases: undefined,
    },
    summarize: {
      title: "Riassumi",
      aliases: undefined,
    },
    add_action_items: {
      title: "Aggiungi elementi d'azione",
      aliases: undefined,
    },
    write_anything: {
      title: "Scrivi qualsiasi cosa…",
      aliases: undefined,
      prompt_placeholder: "Scrivi su ",
    },
    simplify: {
      title: "Semplifica",
      aliases: undefined,
    },
    translate: {
      title: "Traduci…",
      aliases: undefined,
      prompt_placeholder: "Traduci in ",
    },
    fix_spelling: {
      title: "Correggi ortografia",
      aliases: undefined,
    },
    improve_writing: {
      title: "Migliora la scrittura",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Chiedi qualsiasi cosa all'IA…",
    status: {
      thinking: "Sto pensando…",
      editing: "Sto modificando…",
      error: "Ops! Qualcosa è andato storto",
    },
    actions: {
      accept: { title: "Accetta", aliases: undefined },
      retry: { title: "Riprova", aliases: undefined },
      cancel: { title: "Annulla", aliases: undefined },
      revert: { title: "Ripristina", aliases: undefined },
    },
  },
};
