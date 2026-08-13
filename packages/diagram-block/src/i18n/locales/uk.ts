import type { DiagramDictionary } from "../dictionary.js";

export const uk: DiagramDictionary = {
  block: {
    add_source_text: "Додати діаграму Mermaid",
    input_placeholder: "Введіть код діаграми",
    preview_error_text: "Некоректна діаграма (натисніть, щоб редагувати)",
    preview_label: "Діаграма Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Діаграма",
      subtext: "Діаграма, згенерована з коду Mermaid",
      aliases: ["mermaid", "діаграма", "блок-схема", "графік"],
      group: "Розширені",
    },
  },
  block_type_select: {
    name: "Діаграма",
  },
  exporter: {
    invalid_diagram: (source: string) => `Недійсна діаграма "${source}"`,
  },
};
