export const en = {
  block: {
    add_source_text: "Add a LaTeX equation",
    input_placeholder: "Enter equation",
    preview_error_text: "Math block syntax error - click to fix",
  },
  inline: {
    add_source_text: "Add a LaTeX equation",
    input_placeholder: "Enter equation",
    preview_error_text: "Inline math syntax error - click to fix",
  },
  exporter: {
    invalid_formula: (source: string, error: string) =>
      `Invalid formula "${source}": ${error}`,
  },
};
