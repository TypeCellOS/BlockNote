import type { MathDictionary } from "../dictionary.js";

export const ja: MathDictionary = {
  block: {
    add_source_text: "LaTeX数式を追加",
    input_placeholder: "E = mc^2",
    preview_error_text: "無効な数式（クリックして編集）",
  },
  inline: {
    add_source_text: "LaTeX数式を追加",
    input_placeholder: "E = mc^2",
    preview_error_text: "無効な数式（クリックして編集）",
  },
  slash_menu: {
    math_block: {
      title: "数式ブロック",
      subtext: "独立した数式ブロック",
      aliases: ["数式", "すうしき", "math", "latex"],
      group: "高度なブロック",
    },
    inline_math: {
      title: "インライン数式",
      subtext: "テキスト内の数学記号",
      aliases: ["数式", "すうしき", "math", "latex"],
      group: "高度なブロック",
    },
  },
  block_type_select: {
    name: "数式",
  },
  exporter: {
    invalid_formula: (source: string) => `無効な数式 "${source}"`,
  },
};
