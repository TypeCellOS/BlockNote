import type { DiagramDictionary } from "../dictionary.js";

export const es: DiagramDictionary = {
  block: {
    add_source_text: "Agregar diagrama Mermaid",
    input_placeholder: "Introduce el código del diagrama",
    preview_error_text: "Diagrama no válido (haz clic para editar)",
    preview_label: "Diagrama Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Diagrama",
      subtext: "Diagrama renderizado a partir de código Mermaid",
      aliases: ["mermaid", "diagrama", "diagrama de flujo", "gráfico"],
      group: "Avanzado",
    },
  },
  block_type_select: {
    name: "Diagrama",
  },
  exporter: {
    invalid_diagram: (source: string) => `Diagrama no válido "${source}"`,
  },
};
