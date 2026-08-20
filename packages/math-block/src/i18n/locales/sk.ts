import type { MathDictionary } from "../dictionary.js";

export const sk: MathDictionary = {
  block: {
    add_source_text: "Pridať rovnicu LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Neplatná rovnica (kliknutím upravíte)",
  },
  inline: {
    add_source_text: "Pridať rovnicu LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Neplatná rovnica (kliknutím upravíte)",
  },
  slash_menu: {
    math_block: {
      title: "Bloková rovnica",
      subtext: "Samostatný blok matematickej rovnice",
      aliases: ["matematika", "vzorec", "rovnica", "latex"],
      group: "Pokročilé",
    },
    inline_math: {
      title: "Rovnica v texte",
      subtext: "Matematické symboly v texte",
      aliases: ["matematika", "vzorec", "rovnica", "latex"],
      group: "Pokročilé",
    },
  },
  block_type_select: {
    name: "Rovnica",
  },
  exporter: {
    invalid_formula: (source: string) => `Neplatný vzorec "${source}"`,
  },
};
