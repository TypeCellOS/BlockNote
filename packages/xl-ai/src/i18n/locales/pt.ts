import type { AIDictionary } from "../dictionary";

export const pt: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Editar com IA",
    },
  },
  slash_menu: {
    ai: {
      title: "Perguntar à IA",
      subtext: "Escrever com IA",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "assistant",
        "generate",
      ],
      group: "IA",
    },
  },
  ai_default_commands: {
    continue_writing: {
      title: "Continuar Escrevendo",
      aliases: undefined,
    },
    summarize: {
      title: "Resumir",
      aliases: undefined,
    },
    add_action_items: {
      title: "Adicionar Itens de Ação",
      aliases: undefined,
    },
    write_anything: {
      title: "Escrever Qualquer Coisa…",
      aliases: undefined,
      prompt_placeholder: "Escrever sobre ",
    },
    simplify: {
      title: "Simplificar",
      aliases: undefined,
    },
    translate: {
      title: "Traduzir…",
      aliases: undefined,
      prompt_placeholder: "Traduzir para ",
    },
    fix_spelling: {
      title: "Corrigir Ortografia",
      aliases: undefined,
    },
    improve_writing: {
      title: "Melhorar Escrita",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Pergunte qualquer coisa à IA…",
    status: {
      thinking: "Pensando…",
      editing: "Editando…",
      error: "Ops! Algo deu errado",
    },
    actions: {
      accept: { title: "Aceitar", aliases: undefined },
      retry: { title: "Tentar Novamente", aliases: undefined },
      cancel: { title: "Cancelar", aliases: undefined },
      revert: { title: "Reverter", aliases: undefined },
    },
  },
};
