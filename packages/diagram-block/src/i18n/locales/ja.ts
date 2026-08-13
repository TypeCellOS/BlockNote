import type { DiagramDictionary } from "../dictionary.js";

export const ja: DiagramDictionary = {
  block: {
    add_source_text: "Mermaidダイアグラムを追加",
    input_placeholder: "ダイアグラムのコードを入力",
    preview_error_text: "無効なダイアグラム（クリックして編集）",
    preview_label: "Mermaidダイアグラム",
  },
  slash_menu: {
    diagram: {
      title: "ダイアグラム",
      subtext: "Mermaidソースから描画されるダイアグラム",
      aliases: ["ダイアグラム", "図", "フローチャート", "mermaid"],
      group: "高度なブロック",
    },
  },
  block_type_select: {
    name: "ダイアグラム",
  },
  exporter: {
    invalid_diagram: (source: string) => `無効な図 "${source}"`,
  },
};
