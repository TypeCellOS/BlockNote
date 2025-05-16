import type { AIDictionary } from "../dictionary";

export const ko: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "콘텐츠 생성",
      input_placeholder: "프롬프트 입력",
      thinking: "생각 중",
      editing: "편집 중",
      error: "오류가 발생했습니다",
    },
  },
  slash_menu: {
    ai: {
      title: "AI에게 질문하기",
      subtext: "AI로 계속 작성하기",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
  },
  ai_menu: {
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
    accept: { title: "수락", aliases: undefined },
    retry: { title: "다시 시도", aliases: undefined },
    revert: { title: "되돌리기", aliases: undefined },
  },
};
