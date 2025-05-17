import type { AIDictionary } from "../dictionary";

export const fr: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Éditer avec l'IA",
    },
  },
  slash_menu: {
    ai: {
      title: "Demander à l'IA",
      subtext: "Écrire avec l'IA",
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
      title: "Continuer à écrire",
      aliases: undefined,
    },
    summarize: {
      title: "Résumer",
      aliases: undefined,
    },
    add_action_items: {
      title: "Ajouter des éléments d'action",
      aliases: undefined,
    },
    write_anything: {
      title: "Écrire n'importe quoi…",
      aliases: undefined,
      prompt_placeholder: "Écrire à propos de ",
    },
    simplify: {
      title: "Simplifier",
      aliases: undefined,
    },
    translate: {
      title: "Traduire…",
      aliases: undefined,
      prompt_placeholder: "Traduire en ",
    },
    fix_spelling: {
      title: "Corriger l'orthographe",
      aliases: undefined,
    },
    improve_writing: {
      title: "Améliorer l'écriture",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Demandez n'importe quoi à l'IA…",
    status: {
      thinking: "Réflexion…",
      editing: "Édition…",
      error: "Oups ! Une erreur s'est produite",
    },
    actions: {
      accept: { title: "Accepter", aliases: undefined },
      retry: { title: "Réessayer", aliases: undefined },
      cancel: { title: "Annuler", aliases: undefined },
      revert: { title: "Annuler", aliases: undefined },
    },
  },
};
