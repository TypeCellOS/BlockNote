import type { AIDictionary } from "../dictionary";

export const es: AIDictionary = {
  formatting_toolbar: {
    ai: {
      tooltip: "Editar con IA",
    },
  },
  slash_menu: {
    ai: {
      title: "Preguntar a la IA",
      subtext: "Escribir con IA",
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
      title: "Continuar escribiendo",
      aliases: undefined,
    },
    summarize: {
      title: "Resumir",
      aliases: undefined,
    },
    add_action_items: {
      title: "Añadir elementos de acción",
      aliases: undefined,
    },
    write_anything: {
      title: "Escribir cualquier cosa…",
      aliases: undefined,
      prompt_placeholder: "Escribir sobre ",
    },
    simplify: {
      title: "Simplificar",
      aliases: undefined,
    },
    translate: {
      title: "Traducir…",
      aliases: undefined,
      prompt_placeholder: "Traducir a ",
    },
    fix_spelling: {
      title: "Corregir ortografía",
      aliases: undefined,
    },
    improve_writing: {
      title: "Mejorar la escritura",
      aliases: undefined,
    },
  },
  ai_menu: {
    input_placeholder: "Pregunta cualquier cosa a la IA…",
    status: {
      thinking: "Pensando…",
      editing: "Editando…",
      error: "¡Ups! Algo salió mal",
    },
    actions: {
      accept: { title: "Aceptar", aliases: undefined },
      retry: { title: "Reintentar", aliases: undefined },
      cancel: { title: "Cancelar", aliases: undefined },
      revert: { title: "Revertir", aliases: undefined },
    },
  },
};
