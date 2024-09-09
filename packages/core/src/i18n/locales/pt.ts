import type { Dictionary } from "../dictionary";

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
    numbered_list: {
      title: "Lista Numerada",
      subtext: "Usado para exibir uma lista numerada",
      aliases: ["ol", "li", "lista", "listanumerada", "lista numerada"],
      group: "Blocos Básicos",
    },
    bullet_list: {
      title: "Lista com Marcadores",
      subtext: "Usado para exibir uma lista não ordenada",
      aliases: ["ul", "li", "lista", "listamarcadores", "lista com marcadores"],
      group: "Blocos Básicos",
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
      group: "Blocos Básicos",
    },
    paragraph: {
      title: "Parágrafo",
      subtext: "Usado para o corpo do seu documento",
      aliases: ["p", "paragrafo"],
      group: "Blocos Básicos",
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
    bulletListItem: "Lista",
    numberedListItem: "Lista",
    checkListItem: "Lista",
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
  },
  table_handle: {
    delete_column_menuitem: "Excluir coluna",
    delete_row_menuitem: "Excluir linha",
    add_left_menuitem: "Adicionar coluna à esquerda",
    add_right_menuitem: "Adicionar coluna à direita",
    add_above_menuitem: "Adicionar linha acima",
    add_below_menuitem: "Adicionar linha abaixo",
  },
  suggestion_menu: {
    no_items_title: "Nenhum item encontrado",
    loading: "Carregando…",
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
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
