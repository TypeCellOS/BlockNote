import type { AIDictionary } from "../dictionary";

export const is: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Breyta með gervigreind",
    },
  },
  slash_menu: {
    ai: {
      title: "Spyrja gervigreind",
      subtext: "Skrifa með gervigreind",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "Gervigreind",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Halda áfram að skrifa",
      aliases: undefined,
    },
    summarize: {
      title: "Draga saman",
      aliases: undefined,
    },
    add_action_items: {
      title: "Bæta við aðgerðaatriðum",
      aliases: undefined,
    },
    write_anything: {
      title: "Skrifa hvað sem er…",
      aliases: undefined,
      prompt_placeholder: "Skrifa um ",
    },
    simplify: {
      title: "Einfalda",
      aliases: undefined,
    },
    translate: {
      title: "Þýða…",
      aliases: undefined,
      prompt_placeholder: "Þýða yfir á ",
    },
    fix_spelling: {
      title: "Laga stafsetningu",
      aliases: undefined,
    },
    improve_writing: {
      title: "Bæta ritun",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Spyrðu gervigreind um hvað sem er…",
    status: {
      thinking: "Hugsa…",
      editing: "Breyta…",
      error: "Ups! Eitthvað fór úrskeiðis",
    },
    actions: {
      accept: { title: "Samþykkja", aliases: undefined },
      retry: { title: "Reyna aftur", aliases: undefined },
      cancel: { title: "Hætta við", aliases: undefined },
      revert: { title: "Afturkalla", aliases: undefined },
    },
  },
};
