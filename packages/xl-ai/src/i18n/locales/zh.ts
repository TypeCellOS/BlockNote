import type { AIDictionary } from "../dictionary";

export const zh: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "使用人工智能编辑",
    },
  },
  slash_menu: {
    ai: {
      title: "询问人工智能",
      subtext: "使用人工智能写作",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "人工智能",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "继续写作",
      aliases: undefined,
    },
    summarize: {
      title: "总结",
      aliases: undefined,
    },
    add_action_items: {
      title: "添加行动项",
      aliases: undefined,
    },
    write_anything: {
      title: "写任何内容…",
      aliases: undefined,
      prompt_placeholder: "写关于 ",
    },
    simplify: {
      title: "简化",
      aliases: undefined,
    },
    translate: {
      title: "翻译…",
      aliases: undefined,
      prompt_placeholder: "翻译成 ",
    },
    fix_spelling: {
      title: "修正拼写",
      aliases: undefined,
    },
    improve_writing: {
      title: "改进写作",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "向人工智能提问任何问题…",
    status: {
      thinking: "思考中…",
      editing: "编辑中…",
      error: "哎呀！出了点问题",
    },
    actions: {
      accept: { title: "接受", aliases: undefined },
      retry: { title: "重试", aliases: undefined },
      cancel: { title: "取消", aliases: undefined },
      revert: { title: "恢复", aliases: undefined },
    },
  },
};
