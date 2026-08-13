import type { MathDictionary } from "../dictionary.js";

export const hr: MathDictionary = {
  block: {
    add_source_text: "Dodaj LaTeX jednadžbu",
    input_placeholder: "E = mc^2",
    preview_error_text: "Neispravna jednadžba (klikni za uređivanje)",
  },
  inline: {
    add_source_text: "Dodaj LaTeX jednadžbu",
    input_placeholder: "E = mc^2",
    preview_error_text: "Neispravna jednadžba (klikni za uređivanje)",
  },
  slash_menu: {
    math_block: {
      title: "Jednadžba u bloku",
      subtext: "Samostalni blok matematičke jednadžbe",
      aliases: ["matematika", "formula", "jednadžba", "latex"],
      group: "Napredno",
    },
    inline_math: {
      title: "Jednadžba u retku",
      subtext: "Matematički simboli u tekstu",
      aliases: ["matematika", "formula", "jednadžba", "latex"],
      group: "Napredno",
    },
  },
  block_type_select: {
    name: "Jednadžba",
  },
  exporter: {
    invalid_formula: (source: string) => `Neispravna formula "${source}"`,
  },
};
