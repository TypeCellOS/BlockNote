import type { AIDictionary } from "../dictionary";

export const vi: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Chỉnh sửa với AI",
    },
  },
  slash_menu: {
    ai: {
      title: "Hỏi AI",
      subtext: "Viết với AI",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "AI",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Tiếp tục Viết",
      aliases: undefined,
    },
    summarize: {
      title: "Tóm tắt",
      aliases: undefined,
    },
    add_action_items: {
      title: "Thêm mục hành động",
      aliases: undefined,
    },
    write_anything: {
      title: "Viết bất kỳ điều gì…",
      aliases: undefined,
      prompt_placeholder: "Viết về ",
    },
    simplify: {
      title: "Đơn giản hóa",
      aliases: undefined,
    },
    translate: {
      title: "Dịch…",
      aliases: undefined,
      prompt_placeholder: "Dịch sang ",
    },
    fix_spelling: {
      title: "Sửa lỗi chính tả",
      aliases: undefined,
    },
    improve_writing: {
      title: "Cải thiện bài viết",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Hỏi AI bất cứ điều gì…",
    status: {
      thinking: "Đang suy nghĩ…",
      editing: "Đang chỉnh sửa…",
      error: "Rất tiếc! Đã xảy ra lỗi",
    },
    actions: {
      accept: { title: "Chấp nhận", aliases: undefined },
      retry: { title: "Thử lại", aliases: undefined },
      cancel: { title: "Hủy bỏ", aliases: undefined },
      revert: { title: "Hoàn tác", aliases: undefined },
    },
  },
};
