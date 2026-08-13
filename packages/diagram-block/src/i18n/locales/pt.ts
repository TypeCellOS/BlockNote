import type { DiagramDictionary } from "../dictionary.js";

export const pt: DiagramDictionary = {
  block: {
    add_source_text: "Adicionar diagrama Mermaid",
    input_placeholder: "Insira o código do diagrama",
    preview_error_text: "Diagrama inválido (clique para editar)",
    preview_label: "Diagrama Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Diagrama",
      subtext: "Diagrama renderizado a partir de código Mermaid",
      aliases: ["mermaid", "diagrama", "fluxograma", "gráfico"],
      group: "Avançado",
    },
  },
  block_type_select: {
    name: "Diagrama",
  },
  exporter: {
    invalid_diagram: (source: string) => `Diagrama inválido "${source}"`,
  },
};
