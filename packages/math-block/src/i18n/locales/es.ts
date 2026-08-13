import type { MathDictionary } from "../dictionary.js";

export const es: MathDictionary = {
  block: {
    add_source_text: "Agregar ecuación LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ecuación no válida (haz clic para editar)",
  },
  inline: {
    add_source_text: "Agregar ecuación LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ecuación no válida (haz clic para editar)",
  },
  slash_menu: {
    math_block: {
      title: "Bloque de Ecuación",
      subtext: "Bloque de ecuación matemática independiente",
      aliases: ["matemáticas", "latex", "fórmula", "ecuación"],
      group: "Avanzado",
    },
    inline_math: {
      title: "Ecuación en línea",
      subtext: "Símbolos matemáticos en el texto",
      aliases: ["matemáticas", "latex", "fórmula", "ecuación"],
      group: "Avanzado",
    },
  },
  block_type_select: {
    name: "Ecuación",
  },
  exporter: {
    invalid_formula: (source: string) => `Fórmula no válida "${source}"`,
  },
};
