import type { DiagramDictionary } from "../dictionary.js";

export const no: DiagramDictionary = {
  block: {
    add_source_text: "Legg til Mermaid-diagram",
    input_placeholder: "Skriv inn diagramkode",
    preview_error_text: "Ugyldig diagram (klikk for å redigere)",
    preview_label: "Mermaid-diagram",
  },
  slash_menu: {
    diagram: {
      title: "Diagram",
      subtext: "Diagram generert fra Mermaid-kode",
      aliases: ["mermaid", "diagram", "flytskjema", "graf"],
      group: "Avansert",
    },
  },
  block_type_select: {
    name: "Diagram",
  },
  exporter: {
    invalid_diagram: (source: string) => `Ugyldig diagram "${source}"`,
  },
};
