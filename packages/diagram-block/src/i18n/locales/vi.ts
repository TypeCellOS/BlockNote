import type { DiagramDictionary } from "../dictionary.js";

export const vi: DiagramDictionary = {
  block: {
    add_source_text: "Thêm sơ đồ Mermaid",
    input_placeholder: "Nhập mã sơ đồ",
    preview_error_text: "Sơ đồ không hợp lệ (nhấp để chỉnh sửa)",
    preview_label: "Sơ đồ Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Sơ đồ",
      subtext: "Sơ đồ được tạo từ mã Mermaid",
      aliases: [
        "mermaid",
        "sơ đồ",
        "lưu đồ",
        "biểu đồ",
        "so do",
        "luu do",
        "bieu do",
      ],
      group: "Nâng cao",
    },
  },
  block_type_select: {
    name: "Sơ đồ",
  },
  exporter: {
    invalid_diagram: (source: string) => `Sơ đồ không hợp lệ "${source}"`,
  },
};
