import type { DiagramDictionary } from "../dictionary.js";

export const de: DiagramDictionary = {
  block: {
    add_source_text: "Mermaid-Diagramm hinzufügen",
    input_placeholder: "Diagrammcode eingeben",
    preview_error_text: "Ungültiges Diagramm (zum Bearbeiten klicken)",
    preview_label: "Mermaid-Diagramm",
  },
  slash_menu: {
    diagram: {
      title: "Diagramm",
      subtext: "Aus Mermaid-Quelltext gerendertes Diagramm",
      aliases: ["mermaid", "diagramm", "flussdiagramm", "graph"],
      group: "Erweitert",
    },
  },
  block_type_select: {
    name: "Diagramm",
  },
  exporter: {
    invalid_diagram: (source: string) => `Ungültiges Diagramm "${source}"`,
  },
};
