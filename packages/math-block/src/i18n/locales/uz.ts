import type { MathDictionary } from "../dictionary.js";

export const uz: MathDictionary = {
  block: {
    add_source_text: "LaTeX tenglamasini qo‘shish",
    input_placeholder: "E = mc^2",
    preview_error_text: "Yaroqsiz tenglama (tahrirlash uchun bosing)",
  },
  inline: {
    add_source_text: "LaTeX tenglamasini qo‘shish",
    input_placeholder: "E = mc^2",
    preview_error_text: "Yaroqsiz tenglama (tahrirlash uchun bosing)",
  },
  slash_menu: {
    math_block: {
      title: "Tenglama bloki",
      subtext: "Mustaqil matematik tenglama bloki",
      aliases: ["matematika", "formula", "tenglama", "latex"],
      group: "Kengaytirilgan",
    },
    inline_math: {
      title: "Matn ichidagi tenglama",
      subtext: "Matn ichidagi matematik belgilar",
      aliases: ["matematika", "formula", "tenglama", "latex"],
      group: "Kengaytirilgan",
    },
  },
  block_type_select: {
    name: "Tenglama",
  },
  exporter: {
    invalid_formula: (source: string) => `Yaroqsiz formula "${source}"`,
  },
};
