import type { MathDictionary } from "../dictionary.js";

export const pt: MathDictionary = {
  block: {
    add_source_text: "Adicionar equação LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Equação inválida (clique para editar)",
  },
  inline: {
    add_source_text: "Adicionar equação LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Equação inválida (clique para editar)",
  },
  slash_menu: {
    math_block: {
      title: "Bloco de Equação",
      subtext: "Bloco de equação matemática independente",
      aliases: ["matemática", "fórmula", "equação", "latex"],
      group: "Avançado",
    },
    inline_math: {
      title: "Equação em linha",
      subtext: "Símbolos matemáticos no texto",
      aliases: ["matemática", "fórmula", "equação", "latex"],
      group: "Avançado",
    },
  },
  block_type_select: {
    name: "Equação",
  },
  exporter: {
    invalid_formula: (source: string) => `Fórmula inválida "${source}"`,
  },
};
