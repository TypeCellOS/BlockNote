import type { Dictionary } from "../dictionary.js";

export const pt: Dictionary = {
  slash_menu: {
    heading: {
      title: "Título",
      subtext: "Usado para um título de nível superior",
      aliases: ["h", "titulo1", "h1"],
      group: "Títulos",
    },
    heading_2: {
      title: "Título 2",
      subtext: "Usado para seções principais",
      aliases: ["h2", "titulo2", "subtitulo"],
      group: "Títulos",
    },
    heading_3: {
      title: "Título 3",
      subtext: "Usado para subseções e títulos de grupo",
      aliases: ["h3", "titulo3", "subtitulo"],
      group: "Títulos",
    },
    heading_4: {
      title: "Título 4",
      subtext: "Usado para subseções menores",
      aliases: ["h4", "titulo4", "subtitulo4"],
      group: "Subtítulos",
    },
    heading_5: {
      title: "Título 5",
      subtext: "Usado para títulos de subseções pequenas",
      aliases: ["h5", "titulo5", "subtitulo5"],
      group: "Subtítulos",
    },
    heading_6: {
      title: "Título 6",
      subtext: "Usado para títulos de nível mais baixo",
      aliases: ["h6", "titulo6", "subtitulo6"],
      group: "Subtítulos",
    },
    toggle_heading: {
      title: "Título Expansível",
      subtext: "Título expansível de nível superior",
      aliases: ["h", "titulo1", "h1", "expansível"],
      group: "Subtítulos",
    },
    toggle_heading_2: {
      title: "Título Expansível 2",
      subtext: "Título expansível para seções principais",
      aliases: ["h2", "titulo2", "subtitulo", "expansível"],
      group: "Subtítulos",
    },
    toggle_heading_3: {
      title: "Título Expansível 3",
      subtext: "Título expansível para subseções e títulos de grupo",
      aliases: ["h3", "titulo3", "subtitulo", "expansível"],
      group: "Subtítulos",
    },
    quote: {
      title: "Citação",
      subtext: "Citação ou trecho",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Blocos básicos",
    },
    numbered_list: {
      title: "Lista Numerada",
      subtext: "Usado para exibir uma lista numerada",
      aliases: ["ol", "li", "lista", "listanumerada", "lista numerada"],
      group: "Blocos básicos",
    },
    bullet_list: {
      title: "Lista com Marcadores",
      subtext: "Usado para exibir uma lista não ordenada",
      aliases: ["ul", "li", "lista", "listamarcadores", "lista com marcadores"],
      group: "Blocos básicos",
    },
    check_list: {
      title: "Lista de verificação",
      subtext: "Usado para exibir uma lista com caixas de seleção",
      aliases: [
        "ul",
        "li",
        "lista",
        "lista de verificação",
        "lista marcada",
        "caixa de seleção",
      ],
      group: "Blocos básicos",
    },
    toggle_list: {
      title: "Lista expansível",
      subtext: "Lista com subitens ocultáveis",
      aliases: ["li", "lista", "lista expansível", "lista recolhível"],
      group: "Blocos básicos",
    },
    paragraph: {
      title: "Parágrafo",
      subtext: "Usado para o corpo do seu documento",
      aliases: ["p", "paragrafo"],
      group: "Blocos básicos",
    },
    code_block: {
      title: "Bloco de Código",
      subtext: "Usado para exibir código com destaque de sintaxe",
      aliases: ["codigo", "pre"],
      group: "Blocos básicos",
    },
    page_break: {
      title: "Quebra de página",
      subtext: "Separador de página",
      aliases: ["page", "break", "separator", "quebra", "separador"],
      group: "Blocos básicos",
    },
    table: {
      title: "Tabela",
      subtext: "Usado para tabelas",
      aliases: ["tabela"],
      group: "Avançado",
    },
    image: {
      title: "Imagem",
      subtext: "Inserir uma imagem",
      aliases: [
        "imagem",
        "uploadImagem",
        "upload",
        "img",
        "foto",
        "media",
        "url",
      ],
      group: "Mídia",
    },
    video: {
      title: "Vídeo",
      subtext: "Inserir um vídeo",
      aliases: [
        "vídeo",
        "uploadVídeo",
        "upload",
        "mp4",
        "filme",
        "mídia",
        "url",
      ],
      group: "Mídia",
    },
    audio: {
      title: "Áudio",
      subtext: "Inserir um áudio",
      aliases: ["áudio", "uploadÁudio", "upload", "mp3", "som", "mídia", "url"],
      group: "Mídia",
    },
    file: {
      title: "Arquivo",
      subtext: "Inserir um arquivo",
      aliases: ["arquivo", "upload", "incorporar", "mídia", "url"],
      group: "Mídia",
    },
    emoji: {
      title: "Emoji",
      subtext: "Usado para inserir um emoji",
      aliases: ["emoji", "emoticon", "expressão emocional", "rosto"],
      group: "Outros",
    },
  },
  placeholders: {
    default: "Digite texto ou use '/' para comandos",
    heading: "Título",
    toggleListItem: "Alternar",
    bulletListItem: "Lista",
    numberedListItem: "Lista",
    checkListItem: "Lista",
    new_comment: "Escreva um comentário...",
    edit_comment: "Editar comentário...",
    comment_reply: "Adicionar comentário...",
  },
  file_blocks: {
    image: {
      add_button_text: "Adicionar imagem",
    },
    video: {
      add_button_text: "Adicionar vídeo",
    },
    audio: {
      add_button_text: "Adicionar áudio",
    },
    file: {
      add_button_text: "Adicionar arquivo",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "Adicionar bloco",
    drag_handle_label: "Abrir menu do bloco",
  },
  drag_handle: {
    delete_menuitem: "Excluir",
    colors_menuitem: "Cores",
    header_row_menuitem: "Cabeçalho de linha",
    header_column_menuitem: "Cabeçalho de coluna",
  },
  table_handle: {
    delete_column_menuitem: "Excluir coluna",
    delete_row_menuitem: "Excluir linha",
    add_left_menuitem: "Adicionar coluna à esquerda",
    add_right_menuitem: "Adicionar coluna à direita",
    add_above_menuitem: "Adicionar linha acima",
    add_below_menuitem: "Adicionar linha abaixo",
    split_cell_menuitem: "Dividir célula",
    merge_cells_menuitem: "Juntar células",
    background_color_menuitem: "Alterar cor de fundo",
  },
  suggestion_menu: {
    no_items_title: "Nenhum item encontrado",
  },
  color_picker: {
    text_title: "Texto",
    background_title: "Fundo",
    colors: {
      default: "Padrão",
      gray: "Cinza",
      brown: "Marrom",
      red: "Vermelho",
      orange: "Laranja",
      yellow: "Amarelo",
      green: "Verde",
      blue: "Azul",
      purple: "Roxo",
      pink: "Rosa",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Negrito",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Itálico",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Sublinhado",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Riscado",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Código",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Cores",
    },
    link: {
      tooltip: "Criar link",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Editar legenda",
      input_placeholder: "Editar legenda",
    },
    file_replace: {
      tooltip: {
        image: "Substituir imagem",
        video: "Substituir vídeo",
        audio: "Substituir áudio",
        file: "Substituir arquivo",
      },
    },
    file_rename: {
      tooltip: {
        image: "Renomear imagem",
        video: "Renomear vídeo",
        audio: "Renomear áudio",
        file: "Renomear arquivo",
      },
      input_placeholder: {
        image: "Renomear imagem",
        video: "Renomear vídeo",
        audio: "Renomear áudio",
        file: "Renomear arquivo",
      },
    },
    file_download: {
      tooltip: {
        image: "Baixar imagem",
        video: "Baixar vídeo",
        audio: "Baixar áudio",
        file: "Baixar arquivo",
      },
    },
    file_delete: {
      tooltip: {
        image: "Excluir imagem",
        video: "Excluir vídeo",
        audio: "Excluir áudio",
        file: "Excluir arquivo",
      },
    },
    file_preview_toggle: {
      tooltip: "Alternar visualização",
    },
    nest: {
      tooltip: "Aninhar bloco",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Desaninhar bloco",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Alinhar à esquerda",
    },
    align_center: {
      tooltip: "Alinhar ao centro",
    },
    align_right: {
      tooltip: "Alinhar à direita",
    },
    align_justify: {
      tooltip: "Justificar texto",
    },
    table_cell_merge: {
      tooltip: "Juntar células",
    },
    comment: {
      tooltip: "Adicionar comentário",
    },
  },
  file_panel: {
    upload: {
      title: "Upload",
      file_placeholder: {
        image: "Upload de imagem",
        video: "Upload de vídeo",
        audio: "Upload de áudio",
        file: "Upload de arquivo",
      },
      upload_error: "Erro: Falha no upload",
    },
    embed: {
      title: "Incorporar",
      embed_button: {
        image: "Incorporar imagem",
        video: "Incorporar vídeo",
        audio: "Incorporar áudio",
        file: "Incorporar arquivo",
      },
      url_placeholder: "Insira a URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Remover link",
    },
    edit: {
      text: "Editar link",
      tooltip: "Editar",
    },
    open: {
      tooltip: "Abrir em nova aba",
    },
    form: {
      title_placeholder: "Editar título",
      url_placeholder: "Editar URL",
    },
  },
  comments: {
    edited: "editado",
    save_button_text: "Salvar",
    cancel_button_text: "Cancelar",
    actions: {
      add_reaction: "Adicionar reação",
      resolve: "Resolver",
      edit_comment: "Editar comentário",
      delete_comment: "Excluir comentário",
      more_actions: "Mais ações",
    },
    reactions: {
      reacted_by: "Reagido por",
    },
    sidebar: {
      marked_as_resolved: "Marcado como resolvido",
      more_replies: (count) => `${count} respostas a mais`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
