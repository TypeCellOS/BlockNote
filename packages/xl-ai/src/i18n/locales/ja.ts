import type { AIDictionary } from "../dictionary";

export const ja: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "コンテンツを生成",
      input_placeholder: "プロンプトを入力",
      thinking: "考え中",
      editing: "編集中",
      error: "エラーが発生しました",
    },
  },
  slash_menu: {
    ai: {
      title: "AIに質問",
      subtext: "AIで執筆を継続",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
  },
  ai_menu: {
    continue_writing: {
      title: "続けて書く",
      aliases: undefined,
    },
    summarize: {
      title: "要約する",
      aliases: undefined,
    },
    add_action_items: {
      title: "アクション項目を追加",
      aliases: undefined,
    },
    write_anything: {
      title: "何でも書く…",
      aliases: undefined,
      prompt_placeholder: "次のことについて書く ",
    },
    simplify: {
      title: "簡略化する",
      aliases: undefined,
    },
    translate: {
      title: "翻訳する…",
      aliases: undefined,
      prompt_placeholder: "次の言語に翻訳 ",
    },
    fix_spelling: {
      title: "スペルを修正",
      aliases: undefined,
    },
    improve_writing: {
      title: "文章を改善",
      aliases: undefined,
    },
    accept: { title: "承認", aliases: undefined },
    retry: { title: "再試行", aliases: undefined },
    revert: { title: "元に戻す", aliases: undefined },
  },
};
