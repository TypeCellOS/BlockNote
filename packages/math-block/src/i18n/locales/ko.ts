import type { MathDictionary } from "../dictionary.js";

export const ko: MathDictionary = {
  block: {
    add_source_text: "LaTeX 수식 추가",
    input_placeholder: "E = mc^2",
    preview_error_text: "잘못된 수식(클릭하여 편집)",
  },
  inline: {
    add_source_text: "LaTeX 수식 추가",
    input_placeholder: "E = mc^2",
    preview_error_text: "잘못된 수식(클릭하여 편집)",
  },
  slash_menu: {
    math_block: {
      title: "수식 블록",
      subtext: "독립된 수식 블록",
      aliases: ["수식", "공식", "math", "latex"],
      group: "고급",
    },
    inline_math: {
      title: "인라인 수식",
      subtext: "텍스트 속 수학 기호",
      aliases: ["수식", "공식", "math", "latex"],
      group: "고급",
    },
  },
  block_type_select: {
    name: "수식",
  },
  exporter: {
    invalid_formula: (source: string) => `잘못된 수식 "${source}"`,
  },
};
