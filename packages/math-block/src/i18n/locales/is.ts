import type { MathDictionary } from "../dictionary.js";

export const is: MathDictionary = {
  block: {
    add_source_text: "Bæta við LaTeX-jöfnu",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ógild jafna (smelltu til að breyta)",
  },
  inline: {
    add_source_text: "Bæta við LaTeX-jöfnu",
    input_placeholder: "E = mc^2",
    preview_error_text: "Ógild jafna (smelltu til að breyta)",
  },
  slash_menu: {
    math_block: {
      title: "Jöfnublokk",
      subtext: "Sjálfstæð jöfnublokk",
      aliases: ["stærðfræði", "formúla", "jafna", "latex"],
      group: "Ítarlegt",
    },
    inline_math: {
      title: "Innfelld jafna",
      subtext: "Stærðfræðitákn í texta",
      aliases: ["stærðfræði", "formúla", "jafna", "latex"],
      group: "Ítarlegt",
    },
  },
  block_type_select: {
    name: "Jafna",
  },
  exporter: {
    invalid_formula: (source: string) => `Ógild formúla "${source}"`,
  },
};
