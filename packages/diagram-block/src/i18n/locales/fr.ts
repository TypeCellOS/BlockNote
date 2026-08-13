import type { DiagramDictionary } from "../dictionary.js";

export const fr: DiagramDictionary = {
  block: {
    add_source_text: "Ajouter un diagramme Mermaid",
    input_placeholder: "Saisir le code du diagramme",
    preview_error_text: "Diagramme non valide (cliquez pour modifier)",
    preview_label: "Diagramme Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Diagramme",
      subtext: "Diagramme généré à partir du code Mermaid",
      aliases: ["mermaid", "diagramme", "organigramme", "graphique"],
      group: "Avancé",
    },
  },
  block_type_select: {
    name: "Diagramme",
  },
  exporter: {
    invalid_diagram: (source: string) => `Diagramme non valide "${source}"`,
  },
};
