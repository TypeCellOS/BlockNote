import type { DiagramDictionary } from "../dictionary.js";

export const fa: DiagramDictionary = {
  block: {
    add_source_text: "افزودن نمودار Mermaid",
    input_placeholder: "کد نمودار را وارد کنید",
    preview_error_text: "نمودار نامعتبر (برای ویرایش کلیک کنید)",
    preview_label: "نمودار Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "نمودار",
      subtext: "نمودار رسم‌شده از کد Mermaid",
      aliases: ["نمودار", "فلوچارت", "mermaid", "چارت"],
      group: "پیشرفته",
    },
  },
  block_type_select: {
    name: "نمودار",
  },
  exporter: {
    invalid_diagram: (source: string) =>
      `نمودار نامعتبر "\u2068${source}\u2069"`,
  },
};
