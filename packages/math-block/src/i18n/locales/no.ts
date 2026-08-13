import type { MathDictionary } from "../dictionary.js";

export const no: MathDictionary = {
  block: {
    add_source_text: "Legg til LaTeX-ligning",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ugyldig ligning (klikk for å redigere)",
  },
  inline: {
    add_source_text: "Legg til LaTeX-ligning",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ugyldig ligning (klikk for å redigere)",
  },
  slash_menu: {
    math_block: {
      title: "Blokkligning",
      subtext: "Frittstående ligningsblokk",
      aliases: ["matte", "formel", "ligning", "latex"],
      group: "Avansert",
    },
    inline_math: {
      title: "Innebygd ligning",
      subtext: "Matematiske symboler i tekst",
      aliases: ["matte", "formel", "ligning", "latex"],
      group: "Avansert",
    },
  },
  block_type_select: {
    name: "Ligning",
  },
  exporter: {
    invalid_formula: (source: string) => `Ugyldig formel "${source}"`,
  },
};
