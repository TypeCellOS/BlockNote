import type { AIDictionary } from "../dictionary";

export const zhTw: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "使用人工智慧編輯",
    },
  },
  slash_menu: {
    ai: {
      title: "詢問人工智慧",
      subtext: "使用人工智慧寫作",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "人工智慧",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "繼續寫作",
      aliases: undefined,
    },
    summarize: {
      title: "摘要",
      aliases: undefined,
    },
    add_action_items: {
      title: "添加行動項目",
      aliases: undefined,
    },
    write_anything: {
      title: "寫任何內容…",
      aliases: undefined,
      prompt_placeholder: "寫關於 ",
    },
    simplify: {
      title: "簡化",
      aliases: undefined,
    },
    translate: {
      title: "翻譯…",
      aliases: undefined,
      prompt_placeholder: "翻譯成 ",
    },
    fix_spelling: {
      title: "修正拼寫",
      aliases: undefined,
    },
    improve_writing: {
      title: "改進寫作",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "向人工智慧提問任何問題…",
    status: {
      thinking: "思考中…",
      editing: "編輯中…",
      error: "哎呀！發生了一些錯誤",
    },
    actions: {
      accept: { title: "接受", aliases: undefined },
      retry: { title: "重試", aliases: undefined },
      cancel: { title: "取消", aliases: undefined },
      revert: { title: "恢復", aliases: undefined },
    },
  },
};
