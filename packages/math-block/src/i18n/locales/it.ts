import type { MathDictionary } from "../dictionary.js";

export const it: MathDictionary = {
  block: {
    add_source_text: "Aggiungi equazione LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Equazione non valida (clicca per modificare)",
  },
  inline: {
    add_source_text: "Aggiungi equazione LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Equazione non valida (clicca per modificare)",
  },
  slash_menu: {
    math_block: {
      title: "Blocco Equazione",
      subtext: "Blocco di equazione matematica indipendente",
      aliases: ["matematica", "formula", "equazione", "latex"],
      group: "Avanzato",
    },
    inline_math: {
      title: "Equazione in linea",
      subtext: "Simboli matematici nel testo",
      aliases: ["matematica", "formula", "equazione", "latex"],
      group: "Avanzato",
    },
  },
  block_type_select: {
    name: "Equazione",
  },
  exporter: {
    invalid_formula: (source: string) => `Formula non valida "${source}"`,
  },
};
