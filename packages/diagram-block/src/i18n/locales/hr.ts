import type { DiagramDictionary } from "../dictionary.js";

export const hr: DiagramDictionary = {
  block: {
    add_source_text: "Dodaj Mermaid dijagram",
    input_placeholder: "Unesi kod dijagrama",
    preview_error_text: "Neispravan dijagram (klikni za uređivanje)",
    preview_label: "Mermaid dijagram",
  },
  slash_menu: {
    diagram: {
      title: "Dijagram",
      subtext: "Dijagram iscrtan iz Mermaid koda",
      aliases: ["mermaid", "dijagram", "dijagram toka", "graf"],
      group: "Napredno",
    },
  },
  block_type_select: {
    name: "Dijagram",
  },
  exporter: {
    invalid_diagram: (source: string) => `Neispravan dijagram "${source}"`,
  },
};
