import type { MathDictionary } from "../dictionary.js";

export const nl: MathDictionary = {
  block: {
    add_source_text: "LaTeX-formule toevoegen",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ongeldige formule (klik om te bewerken)",
  },
  inline: {
    add_source_text: "LaTeX-formule toevoegen",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ongeldige formule (klik om te bewerken)",
  },
  slash_menu: {
    math_block: {
      title: "Formuleblok",
      subtext: "Losstaande wiskundige formule",
      aliases: ["wiskunde", "formule", "vergelijking", "latex"],
      group: "Geavanceerd",
    },
    inline_math: {
      title: "Inline formule",
      subtext: "Wiskundige symbolen in de tekst",
      aliases: ["wiskunde", "formule", "vergelijking", "latex"],
      group: "Geavanceerd",
    },
  },
  block_type_select: {
    name: "Formule",
  },
  exporter: {
    invalid_formula: (source: string) => `Ongeldige formule "${source}"`,
  },
};
