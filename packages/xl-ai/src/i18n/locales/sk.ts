import type { AIDictionary } from "../dictionary";

export const sk: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Upraviť s AI",
    },
  },
  slash_menu: {
    ai: {
      title: "Opýtať sa AI",
      subtext: "Písať s AI",
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
      title: "Pokračovať v písaní",
      aliases: undefined,
    },
    summarize: {
      title: "Zhrnúť",
      aliases: undefined,
    },
    add_action_items: {
      title: "Pridať akčné položky",
      aliases: undefined,
    },
    write_anything: {
      title: "Napísať čokoľvek…",
      aliases: undefined,
      prompt_placeholder: "Písať o ",
    },
    simplify: {
      title: "Zjednodušiť",
      aliases: undefined,
    },
    translate: {
      title: "Preložiť…",
      aliases: undefined,
      prompt_placeholder: "Preložiť do ",
    },
    fix_spelling: {
      title: "Opraviť pravopis",
      aliases: undefined,
    },
    improve_writing: {
      title: "Vylepšiť písanie",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Opýtajte sa AI čokoľvek…",
    status: {
      thinking: "Premýšľam…",
      editing: "Upravujem…",
      error: "Ups! Niečo sa pokazilo",
    },
    actions: {
      accept: { title: "Prijať", aliases: undefined },
      retry: { title: "Skúsiť znova", aliases: undefined },
      cancel: { title: "Zrušiť", aliases: undefined },
      revert: { title: "Vrátiť späť", aliases: undefined },
    },
  },
};
