import type { AIDictionary } from "../dictionary";

export const fr: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Générer du contenu",
      input_placeholder: "Entrez une requête",
      thinking: "Réflexion en cours",
      editing: "Édition",
      error: "Une erreur s'est produite",
    },
  },
  slash_menu: {
    ai: {
      title: "Demander à l'IA",
      subtext: "Continuer à écrire avec l'IA",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "IA",
    },
  },
  ai_menu: {
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
    accept: { title: "Accepter", aliases: undefined },
    retry: { title: "Réessayer", aliases: undefined },
    revert: { title: "Annuler", aliases: undefined },
  },
};
