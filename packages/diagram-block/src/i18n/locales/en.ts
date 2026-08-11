export const en = {
  block: {
    add_source_text: "Add a Mermaid diagram",
    input_placeholder: "Enter diagram code",
    preview_error_text: "Invalid diagram (click to edit)",
    preview_label: "Mermaid diagram",
  },
  slash_menu: {
    diagram: {
      title: "Diagram",
      subtext: "Diagram rendered from Mermaid source",
      aliases: ["mermaid", "diagram", "flowchart", "chart", "graph"],
      group: "Advanced",
    },
  },
  block_type_select: {
    name: "Diagram",
  },
  exporter: {
    invalid_diagram: (source: string) => `Invalid diagram "${source}"`,
  },
};
