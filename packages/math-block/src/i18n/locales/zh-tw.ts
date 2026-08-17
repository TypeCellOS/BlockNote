import type { MathDictionary } from "../dictionary.js";

export const zhTW: MathDictionary = {
  block: {
    add_source_text: "新增 LaTeX 方程式",
    input_placeholder: "E = mc^2",
    preview_error_text: "無效的方程式（點擊編輯）",
  },
  inline: {
    add_source_text: "新增 LaTeX 方程式",
    input_placeholder: "E = mc^2",
    preview_error_text: "無效的方程式（點擊編輯）",
  },
  slash_menu: {
    math_block: {
      title: "方程式區塊",
      subtext: "獨立的數學方程式區塊",
      aliases: ["數學", "公式", "方程式", "latex"],
      group: "進階功能",
    },
    inline_math: {
      title: "行內方程式",
      subtext: "文字中的數學符號",
      aliases: ["數學", "公式", "方程式", "latex"],
      group: "進階功能",
    },
  },
  block_type_select: {
    name: "方程式",
  },
  exporter: {
    invalid_formula: (source: string) => `無效的公式 "${source}"`,
  },
};
