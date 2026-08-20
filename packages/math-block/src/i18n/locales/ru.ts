import type { MathDictionary } from "../dictionary.js";

export const ru: MathDictionary = {
  block: {
    add_source_text: "Добавить формулу LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Некорректная формула (нажмите, чтобы изменить)",
  },
  inline: {
    add_source_text: "Добавить формулу LaTeX",
    input_placeholder: "E = mc^2",
    preview_error_text: "Некорректная формула (нажмите, чтобы изменить)",
  },
  slash_menu: {
    math_block: {
      title: "Блочная формула",
      subtext: "Отдельный блок с математической формулой",
      aliases: ["математика", "формула", "уравнение", "latex"],
      group: "Продвинутый",
    },
    inline_math: {
      title: "Встроенная формула",
      subtext: "Математические символы в тексте",
      aliases: ["математика", "формула", "уравнение", "latex"],
      group: "Продвинутый",
    },
  },
  block_type_select: {
    name: "Формула",
  },
  exporter: {
    invalid_formula: (source: string) => `Недопустимая формула "${source}"`,
  },
};
