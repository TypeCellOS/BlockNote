import type { AIDictionary } from "../dictionary";

export const hr: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Uredi s AI",
    },
  },
  slash_menu: {
    ai: {
      title: "Pitaj AI",
      subtext: "Piši s AI",
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
      title: "Nastavi pisati",
      aliases: undefined,
    },
    summarize: {
      title: "Sažmi",
      aliases: undefined,
    },
    add_action_items: {
      title: "Dodaj stavke akcije",
      aliases: undefined,
    },
    write_anything: {
      title: "Napiši bilo što…",
      aliases: undefined,
      prompt_placeholder: "Piši o ",
    },
    simplify: {
      title: "Pojednostavi",
      aliases: undefined,
    },
    translate: {
      title: "Prevedi…",
      aliases: undefined,
      prompt_placeholder: "Prevedi na ",
    },
    fix_spelling: {
      title: "Ispravi pravopis",
      aliases: undefined,
    },
    improve_writing: {
      title: "Poboljšaj pisanje",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Pitaj AI bilo što…",
    status: {
      thinking: "Razmišljam…",
      editing: "Uređujem…",
      error: "Ups! Nešto je pošlo po zlu",
    },
    actions: {
      accept: { title: "Prihvati", aliases: undefined },
      retry: { title: "Pokušaj ponovno", aliases: undefined },
      cancel: { title: "Odustani", aliases: undefined },
      revert: { title: "Vrati", aliases: undefined },
    },
  },
};
