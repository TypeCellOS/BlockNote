import type { DiagramDictionary } from "../dictionary.js";

export const he: DiagramDictionary = {
  block: {
    add_source_text: "הוסף תרשים Mermaid",
    input_placeholder: "הזן קוד תרשים",
    preview_error_text: "תרשים לא תקין (לחץ לעריכה)",
    preview_label: "תרשים Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "תרשים",
      subtext: "תרשים שנוצר מקוד Mermaid",
      aliases: ["תרשים", "תרשים זרימה", "mermaid", "גרף"],
      group: "מתקדם",
    },
  },
  block_type_select: {
    name: "תרשים",
  },
  exporter: {
    invalid_diagram: (source: string) =>
      `תרשים לא חוקי "\u2068${source}\u2069"`,
  },
};
