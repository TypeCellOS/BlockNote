import type { DiagramDictionary } from "../dictionary.js";

export const is: DiagramDictionary = {
  block: {
    add_source_text: "Bæta við Mermaid-skýringarmynd",
    input_placeholder: "Sláðu inn kóða skýringarmyndar",
    preview_error_text: "Ógild skýringarmynd (smelltu til að breyta)",
    preview_label: "Mermaid-skýringarmynd",
  },
  slash_menu: {
    diagram: {
      title: "Skýringarmynd",
      subtext: "Skýringarmynd teiknuð úr Mermaid-kóða",
      aliases: ["mermaid", "skýringarmynd", "flæðirit", "graf"],
      group: "Ítarlegt",
    },
  },
  block_type_select: {
    name: "Skýringarmynd",
  },
  exporter: {
    invalid_diagram: (source: string) => `Ógild skýringarmynd "${source}"`,
  },
};
