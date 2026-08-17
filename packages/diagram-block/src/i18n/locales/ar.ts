import type { DiagramDictionary } from "../dictionary.js";

export const ar: DiagramDictionary = {
  block: {
    add_source_text: "إضافة مخطط Mermaid",
    input_placeholder: "أدخل كود المخطط",
    preview_error_text: "مخطط غير صالح (انقر للتعديل)",
    preview_label: "مخطط Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "مخطط",
      subtext: "مخطط مرسوم من مصدر Mermaid",
      aliases: ["مخطط", "رسم بياني", "مخطط انسيابي", "mermaid", "flowchart"],
      group: "متقدم",
    },
  },
  block_type_select: {
    name: "مخطط",
  },
  exporter: {
    invalid_diagram: (source: string) =>
      `مخطط غير صالح "\u2068${source}\u2069"`,
  },
};
