import type { DiagramDictionary } from "../dictionary.js";

export const zh: DiagramDictionary = {
  block: {
    add_source_text: "添加 Mermaid 图表",
    input_placeholder: "输入图表代码",
    preview_error_text: "无效的图表（点击编辑）",
    preview_label: "Mermaid 图表",
  },
  slash_menu: {
    diagram: {
      title: "图表",
      subtext: "由 Mermaid 源码渲染的图表",
      aliases: ["mermaid", "图表", "流程图", "示意图"],
      group: "高级功能",
    },
  },
  block_type_select: {
    name: "图表",
  },
  exporter: {
    invalid_diagram: (source: string) => `无效的图表 "${source}"`,
  },
};
