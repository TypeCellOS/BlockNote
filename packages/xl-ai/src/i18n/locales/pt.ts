import type { AIDictionary } from "../dictionary";

export const pt: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Gerar conteúdo",
      input_placeholder: "Digite um comando",
      thinking: "Pensando",
      editing: "Editando",
      error: "Ocorreu um erro",
    },
  },
  slash_menu: {
    ai: {
      title: "Perguntar à IA",
      subtext: "Continuar escrevendo com IA",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "IA",
    },
  },
  ai_menu: {
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
    accept: { title: "Aceitar", aliases: undefined },
    retry: { title: "Tentar Novamente", aliases: undefined },
    revert: { title: "Reverter", aliases: undefined },
  },
};
