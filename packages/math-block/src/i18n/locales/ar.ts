import type { MathDictionary } from "../dictionary.js";

export const ar: MathDictionary = {
  block: {
    add_source_text: "إضافة معادلة LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "معادلة غير صالحة (انقر للتعديل)",
  },
  inline: {
    add_source_text: "إضافة معادلة LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "معادلة غير صالحة (انقر للتعديل)",
  },
  slash_menu: {
    math_block: {
      title: "معادلة مستقلة",
      subtext: "كتلة معادلة رياضية مستقلة",
      aliases: ["رياضيات", "معادلة", "صيغة", "latex"],
      group: "متقدم",
    },
    inline_math: {
      title: "معادلة ضمن السطر",
      subtext: "رموز رياضية داخل النص",
      aliases: ["رياضيات", "معادلة", "صيغة", "latex"],
      group: "متقدم",
    },
  },
  block_type_select: {
    name: "معادلة",
  },
  exporter: {
    invalid_formula: (source: string) =>
      `صيغة غير صالحة "\u2068${source}\u2069"`,
  },
};
