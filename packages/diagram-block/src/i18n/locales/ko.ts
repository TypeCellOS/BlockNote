import type { DiagramDictionary } from "../dictionary.js";

export const ko: DiagramDictionary = {
  block: {
    add_source_text: "Mermaid 다이어그램 추가",
    input_placeholder: "다이어그램 코드 입력",
    preview_error_text: "잘못된 다이어그램(클릭하여 편집)",
    preview_label: "Mermaid 다이어그램",
  },
  slash_menu: {
    diagram: {
      title: "다이어그램",
      subtext: "Mermaid 소스로 렌더링되는 다이어그램",
      aliases: ["다이어그램", "순서도", "mermaid", "차트"],
      group: "고급",
    },
  },
  block_type_select: {
    name: "다이어그램",
  },
  exporter: {
    invalid_diagram: (source: string) => `잘못된 다이어그램 "${source}"`,
  },
};
