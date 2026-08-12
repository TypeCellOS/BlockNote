import type { MathDictionary } from "../dictionary.js";

export const fa: MathDictionary = {
  block: {
    add_source_text: "افزودن معادله LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "معادله نامعتبر (برای ویرایش کلیک کنید)",
  },
  inline: {
    add_source_text: "افزودن معادله LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "معادله نامعتبر (برای ویرایش کلیک کنید)",
  },
  slash_menu: {
    math_block: {
      title: "بلوک معادله",
      subtext: "بلوک معادله ریاضی مستقل",
      aliases: ["ریاضی", "فرمول", "معادله", "latex"],
      group: "پیشرفته",
    },
    inline_math: {
      title: "معادله درون‌خطی",
      subtext: "نمادهای ریاضی درون متن",
      aliases: ["ریاضی", "فرمول", "معادله", "latex"],
      group: "پیشرفته",
    },
  },
  block_type_select: {
    name: "معادله",
  },
  exporter: {
    invalid_formula: (source: string) =>
      `فرمول نامعتبر "\u2068${source}\u2069"`,
  },
};
