export const en = {
  block: {
    add_source_text: "Add a LaTeX equation",
    input_placeholder: "E = mc^2",
    preview_error_text: "Invalid equation (click to edit)",
  },
  inline: {
    add_source_text: "Add a LaTeX equation",
    input_placeholder: "E = mc^2",
    preview_error_text: "Invalid equation (click to edit)",
  },
  slash_menu: {
    math_block: {
      title: "Block Equation",
      subtext: "Standalone math equation block",
      aliases: ["math", "latex", "formula", "equation"],
      group: "Advanced",
    },
    inline_math: {
      title: "Inline Equation",
      subtext: "Math symbols in text",
      aliases: ["math", "latex", "formula", "equation"],
      group: "Advanced",
    },
  },
  block_type_select: {
    name: "Equation",
  },
  exporter: {
    invalid_formula: (source: string) => `Invalid formula "${source}"`,
  },
};
