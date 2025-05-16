import type { AIDictionary } from "../dictionary";

export const vi: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Tạo nội dung",
      input_placeholder: "Nhập lệnh",
      thinking: "Đang suy nghĩ",
      editing: "Đang chỉnh sửa",
      error: "Đã xảy ra lỗi",
    },
  },
  slash_menu: {
    ai: {
      title: "Hỏi AI",
      subtext: "Tiếp tục viết với AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
  },
  ai_menu: {
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
    accept: { title: "Chấp nhận", aliases: undefined },
    retry: { title: "Thử lại", aliases: undefined },
    revert: { title: "Hoàn tác", aliases: undefined },
  },
};
