import type { MathDictionary } from "../dictionary.js";

export const de: MathDictionary = {
  block: {
    add_source_text: "LaTeX-Gleichung hinzufügen",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ungültige Gleichung (zum Bearbeiten klicken)",
  },
  inline: {
    add_source_text: "LaTeX-Gleichung hinzufügen",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ungültige Gleichung (zum Bearbeiten klicken)",
  },
  slash_menu: {
    math_block: {
      title: "Blockgleichung",
      subtext: "Eigenständiger Gleichungsblock",
      aliases: ["mathe", "latex", "formel", "gleichung"],
      group: "Erweitert",
    },
    inline_math: {
      title: "Inline-Gleichung",
      subtext: "Mathematische Symbole im Text",
      aliases: ["mathe", "latex", "formel", "gleichung"],
      group: "Erweitert",
    },
  },
  block_type_select: {
    name: "Gleichung",
  },
  exporter: {
    invalid_formula: (source: string) => `Ungültige Formel "${source}"`,
  },
};
