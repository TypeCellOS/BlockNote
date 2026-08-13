import type { DiagramDictionary } from "../dictionary.js";

export const ru: DiagramDictionary = {
  block: {
    add_source_text: "Добавить диаграмму Mermaid",
    input_placeholder: "Введите код диаграммы",
    preview_error_text: "Некорректная диаграмма (нажмите, чтобы изменить)",
    preview_label: "Диаграмма Mermaid",
  },
  slash_menu: {
    diagram: {
      title: "Диаграмма",
      subtext: "Диаграмма, отрисованная из кода Mermaid",
      aliases: ["mermaid", "диаграмма", "блок-схема", "график"],
      group: "Продвинутый",
    },
  },
  block_type_select: {
    name: "Диаграмма",
  },
  exporter: {
    invalid_diagram: (source: string) => `Недопустимая диаграмма "${source}"`,
  },
};
