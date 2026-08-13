import type { MathDictionary } from "../dictionary.js";

export const pl: MathDictionary = {
  block: {
    add_source_text: "Dodaj równanie LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Nieprawidłowe równanie (kliknij, aby edytować)",
  },
  inline: {
    add_source_text: "Dodaj równanie LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Nieprawidłowe równanie (kliknij, aby edytować)",
  },
  slash_menu: {
    math_block: {
      title: "Równanie blokowe",
      subtext: "Samodzielny blok równania matematycznego",
      aliases: ["matematyka", "formuła", "równanie", "latex"],
      group: "Zaawansowane",
    },
    inline_math: {
      title: "Równanie w tekście",
      subtext: "Symbole matematyczne w tekście",
      aliases: ["matematyka", "formuła", "równanie", "latex"],
      group: "Zaawansowane",
    },
  },
  block_type_select: {
    name: "Równanie",
  },
  exporter: {
    invalid_formula: (source: string) => `Nieprawidłowa formuła "${source}"`,
  },
};
