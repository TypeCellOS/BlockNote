import type { DiagramDictionary } from "../dictionary.js";

export const pl: DiagramDictionary = {
  block: {
    add_source_text: "Dodaj diagram Mermaid",
    input_placeholder: "Wprowadź kod diagramu",
    preview_error_text: "Nieprawidłowy diagram (kliknij, aby edytować)",
    preview_label: "Diagram Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Diagram",
      subtext: "Diagram renderowany z kodu Mermaid",
      aliases: ["mermaid", "diagram", "schemat blokowy", "wykres"],
      group: "Zaawansowane",
    },
  },
  block_type_select: {
    name: "Diagram",
  },
  exporter: {
    invalid_diagram: (source: string) => `Nieprawidłowy diagram "${source}"`,
  },
};
