import type { MathDictionary } from "../dictionary.js";

export const uk: MathDictionary = {
  block: {
    add_source_text: "Додати формулу LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Некоректна формула (натисніть, щоб редагувати)",
  },
  inline: {
    add_source_text: "Додати формулу LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Некоректна формула (натисніть, щоб редагувати)",
  },
  slash_menu: {
    math_block: {
      title: "Блокова формула",
      subtext: "Окремий блок з математичною формулою",
      aliases: ["математика", "формула", "рівняння", "latex"],
      group: "Розширені",
    },
    inline_math: {
      title: "Вбудована формула",
      subtext: "Математичні символи в тексті",
      aliases: ["математика", "формула", "рівняння", "latex"],
      group: "Розширені",
    },
  },
  block_type_select: {
    name: "Формула",
  },
  exporter: {
    invalid_formula: (source: string) => `Недійсна формула "${source}"`,
  },
};
