import type { MathDictionary } from "../dictionary.js";

export const zh: MathDictionary = {
  block: {
    add_source_text: "添加 LaTeX 公式",
    input_placeholder: "E = mc^2",
    preview_error_text: "无效的公式（点击编辑）",
  },
  inline: {
    add_source_text: "添加 LaTeX 公式",
    input_placeholder: "E = mc^2",
    preview_error_text: "无效的公式（点击编辑）",
  },
  slash_menu: {
    math_block: {
      title: "块级公式",
      subtext: "独立的数学公式块",
      aliases: ["数学", "公式", "方程", "latex"],
      group: "高级功能",
    },
    inline_math: {
      title: "行内公式",
      subtext: "文本中的数学符号",
      aliases: ["数学", "公式", "方程", "latex"],
      group: "高级功能",
    },
  },
  block_type_select: {
    name: "公式",
  },
  exporter: {
    invalid_formula: (source: string) => `无效的公式 "${source}"`,
  },
};
