import type { DiagramDictionary } from "../dictionary.js";

export const zhTW: DiagramDictionary = {
  block: {
    add_source_text: "新增 Mermaid 圖表",
    input_placeholder: "輸入圖表原始碼",
    preview_error_text: "無效的圖表（點擊編輯）",
    preview_label: "Mermaid 圖表",
  },
  slash_menu: {
    diagram: {
      title: "圖表",
      subtext: "以 Mermaid 原始碼繪製的圖表",
      aliases: ["mermaid", "圖表", "流程圖", "示意圖"],
      group: "進階功能",
    },
  },
  block_type_select: {
    name: "圖表",
  },
  exporter: {
    invalid_diagram: (source: string) => `無效的圖表 "${source}"`,
  },
};
