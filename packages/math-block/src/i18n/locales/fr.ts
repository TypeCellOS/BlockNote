import type { MathDictionary } from "../dictionary.js";

export const fr: MathDictionary = {
  block: {
    add_source_text: "Ajouter une équation LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Équation non valide (cliquez pour modifier)",
  },
  inline: {
    add_source_text: "Ajouter une équation LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Équation non valide (cliquez pour modifier)",
  },
  slash_menu: {
    math_block: {
      title: "Bloc d'équation",
      subtext: "Bloc d'équation mathématique autonome",
      aliases: ["maths", "latex", "formule", "équation"],
      group: "Avancé",
    },
    inline_math: {
      title: "Équation en ligne",
      subtext: "Symboles mathématiques dans le texte",
      aliases: ["maths", "latex", "formule", "équation"],
      group: "Avancé",
    },
  },
  block_type_select: {
    name: "Équation",
  },
  exporter: {
    invalid_formula: (source: string) => `Formule non valide "${source}"`,
  },
};
