import type { DiagramDictionary } from "../dictionary.js";

export const uz: DiagramDictionary = {
  block: {
    add_source_text: "Mermaid diagrammasini qo‘shish",
    input_placeholder: "Diagramma kodini kiriting",
    preview_error_text: "Yaroqsiz diagramma (tahrirlash uchun bosing)",
    preview_label: "Mermaid diagrammasi",
  },
  slash_menu: {
    diagram: {
      title: "Diagramma",
      subtext: "Mermaid kodidan chizilgan diagramma",
      aliases: ["mermaid", "diagramma", "blok-sxema", "grafik"],
      group: "Kengaytirilgan",
    },
  },
  block_type_select: {
    name: "Diagramma",
  },
  exporter: {
    invalid_diagram: (source: string) => `Yaroqsiz diagramma "${source}"`,
  },
};
