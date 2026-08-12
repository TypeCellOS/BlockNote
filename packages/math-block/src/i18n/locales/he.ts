import type { MathDictionary } from "../dictionary.js";

export const he: MathDictionary = {
  block: {
    add_source_text: "הוסף משוואת LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "משוואה לא תקינה (לחץ לעריכה)",
  },
  inline: {
    add_source_text: "הוסף משוואת LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "משוואה לא תקינה (לחץ לעריכה)",
  },
  slash_menu: {
    math_block: {
      title: "בלוק משוואה",
      subtext: "בלוק משוואה מתמטית עצמאי",
      aliases: ["מתמטיקה", "נוסחה", "משוואה", "latex"],
      group: "מתקדם",
    },
    inline_math: {
      title: "משוואה בתוך השורה",
      subtext: "סמלים מתמטיים בתוך הטקסט",
      aliases: ["מתמטיקה", "נוסחה", "משוואה", "latex"],
      group: "מתקדם",
    },
  },
  block_type_select: {
    name: "משוואה",
  },
  exporter: {
    invalid_formula: (source: string) =>
      `נוסחה לא חוקית "\u2068${source}\u2069"`,
  },
};
