import type { MathDictionary } from "../dictionary.js";

export const vi: MathDictionary = {
  block: {
    add_source_text: "Thêm phương trình LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Phương trình không hợp lệ (nhấp để chỉnh sửa)",
  },
  inline: {
    add_source_text: "Thêm phương trình LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Phương trình không hợp lệ (nhấp để chỉnh sửa)",
  },
  slash_menu: {
    math_block: {
      title: "Phương trình dạng khối",
      subtext: "Khối phương trình toán học độc lập",
      aliases: [
        "toán",
        "công thức",
        "phương trình",
        "latex",
        "toan",
        "cong thuc",
        "phuong trinh",
      ],
      group: "Nâng cao",
    },
    inline_math: {
      title: "Phương trình nội dòng",
      subtext: "Ký hiệu toán học trong văn bản",
      aliases: [
        "toán",
        "công thức",
        "phương trình",
        "latex",
        "toan",
        "cong thuc",
        "phuong trinh",
      ],
      group: "Nâng cao",
    },
  },
  block_type_select: {
    name: "Phương trình",
  },
  exporter: {
    invalid_formula: (source: string) => `Công thức không hợp lệ "${source}"`,
  },
};
