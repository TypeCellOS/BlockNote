import type { AIDictionary } from "../dictionary";

export const zh: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt",
    },
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI",
    },
  },
  placeholders: {
    ai: "Enter a prompt",
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"],
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"],
    },
  } as any, // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…",
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert",
  },
};
