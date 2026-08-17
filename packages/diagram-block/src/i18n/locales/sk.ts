import type { DiagramDictionary } from "../dictionary.js";

export const sk: DiagramDictionary = {
  block: {
    add_source_text: "Pridať diagram Mermaid",
    input_placeholder: "Zadajte kód diagramu",
    preview_error_text: "Neplatný diagram (kliknutím upravíte)",
    preview_label: "Diagram Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Diagram",
      subtext: "Diagram vykreslený z kódu Mermaid",
      aliases: ["mermaid", "diagram", "vývojový diagram", "graf"],
      group: "Pokročilé",
    },
  },
  block_type_select: {
    name: "Diagram",
  },
  exporter: {
    invalid_diagram: (source: string) => `Neplatný diagram "${source}"`,
  },
};
