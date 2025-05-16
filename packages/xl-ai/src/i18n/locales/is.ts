import type { AIDictionary } from "../dictionary";

export const is: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Búa til efni",
      input_placeholder: "Sláðu inn leiðbeiningar",
      thinking: "Hugsa",
      editing: "Breyta",
      error: "Villa kom upp",
    },
  },
  slash_menu: {
    ai: {
      title: "Spyrja gervigreind",
      subtext: "Halda áfram að skrifa með gervigreind",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "Gervigreind",
    },
  },
  ai_menu: {
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
    accept: { title: "Samþykkja", aliases: undefined },
    retry: { title: "Reyna aftur", aliases: undefined },
    revert: { title: "Afturkalla", aliases: undefined },
  },
};
