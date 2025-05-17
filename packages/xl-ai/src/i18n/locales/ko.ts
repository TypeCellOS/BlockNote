import type { AIDictionary } from "../dictionary";

export const ko: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "AI로 편집하기",
    },
  },
  slash_menu: {
    ai: {
      title: "AI에게 질문하기",
      subtext: "AI로 작성하기",
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
      title: "계속 작성하기",
      aliases: undefined,
    },
    summarize: {
      title: "요약하기",
      aliases: undefined,
    },
    add_action_items: {
      title: "작업 항목 추가",
      aliases: undefined,
    },
    write_anything: {
      title: "무엇이든 작성하기…",
      aliases: undefined,
      prompt_placeholder: "다음에 대해 작성: ",
    },
    simplify: {
      title: "단순화하기",
      aliases: undefined,
    },
    translate: {
      title: "번역하기…",
      aliases: undefined,
      prompt_placeholder: "다음으로 번역: ",
    },
    fix_spelling: {
      title: "맞춤법 수정",
      aliases: undefined,
    },
    improve_writing: {
      title: "글쓰기 개선",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "AI에게 무엇이든 물어보세요…",
    status: {
      thinking: "생각 중…",
      editing: "편집 중…",
      error: "죄송합니다! 오류가 발생했습니다",
    },
    actions: {
      accept: { title: "수락", aliases: undefined },
      retry: { title: "다시 시도", aliases: undefined },
      cancel: { title: "취소", aliases: undefined },
      revert: { title: "되돌리기", aliases: undefined },
    },
  },
};
