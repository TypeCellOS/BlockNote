import type { DiagramDictionary } from "../dictionary.js";

export const it: DiagramDictionary = {
  block: {
    add_source_text: "Aggiungi diagramma Mermaid",
    input_placeholder: "Inserisci il codice del diagramma",
    preview_error_text: "Diagramma non valido (clicca per modificare)",
    preview_label: "Diagramma Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Diagramma",
      subtext: "Diagramma generato da codice Mermaid",
      aliases: ["mermaid", "diagramma", "diagramma di flusso", "grafico"],
      group: "Avanzato",
    },
  },
  block_type_select: {
    name: "Diagramma",
  },
  exporter: {
    invalid_diagram: (source: string) => `Diagramma non valido "${source}"`,
  },
};
