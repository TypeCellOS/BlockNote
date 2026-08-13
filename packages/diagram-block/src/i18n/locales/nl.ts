import type { DiagramDictionary } from "../dictionary.js";

export const nl: DiagramDictionary = {
  block: {
    add_source_text: "Mermaid-diagram toevoegen",
    input_placeholder: "Voer diagramcode in",
    preview_error_text: "Ongeldig diagram (klik om te bewerken)",
    preview_label: "Mermaid-diagram",
  },
  slash_menu: {
    diagram: {
      title: "Diagram",
      subtext: "Diagram op basis van Mermaid-code",
      aliases: ["mermaid", "diagram", "stroomdiagram", "grafiek"],
      group: "Geavanceerd",
    },
  },
  block_type_select: {
    name: "Diagram",
  },
  exporter: {
    invalid_diagram: (source: string) => `Ongeldig diagram "${source}"`,
  },
};
