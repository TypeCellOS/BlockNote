import { Dictionary } from "../dictionary.js";

export const es: Dictionary = {
  slash_menu: {
    heading: {
      title: "Encabezado 1",
      subtext: "Encabezado de primer nivel",
      aliases: ["h", "encabezado1", "h1"],
      group: "Encabezados",
    },
    heading_2: {
      title: "Encabezado 2",
      subtext: "Encabezado de sección principal",
      aliases: ["h2", "encabezado2", "subencabezado"],
      group: "Encabezados",
    },
    heading_3: {
      title: "Encabezado 3",
      subtext: "Encabezado de subsección y grupo",
      aliases: ["h3", "encabezado3", "subencabezado"],
      group: "Encabezados",
    },
    heading_4: {
      title: "Encabezado 4",
      subtext: "Encabezado de subsección menor",
      aliases: ["h4", "encabezado4", "subencabezado4"],
      group: "Subencabezados",
    },
    heading_5: {
      title: "Encabezado 5",
      subtext: "Encabezado de subsección pequeña",
      aliases: ["h5", "encabezado5", "subencabezado5"],
      group: "Subencabezados",
    },
    heading_6: {
      title: "Encabezado 6",
      subtext: "Encabezado de nivel más bajo",
      aliases: ["h6", "encabezado6", "subencabezado6"],
      group: "Subencabezados",
    },
    toggle_heading: {
      title: "Encabezado Plegable 1",
      subtext: "Encabezado de primer nivel que se puede plegar",
      aliases: ["h", "encabezado1", "h1", "plegable", "contraible"],
      group: "Subencabezados",
    },
    toggle_heading_2: {
      title: "Encabezado Plegable 2",
      subtext: "Encabezado de sección principal que se puede plegar",
      aliases: ["h2", "encabezado2", "subencabezado", "plegable", "contraible"],
      group: "Subencabezados",
    },
    toggle_heading_3: {
      title: "Encabezado Plegable 3",
      subtext: "Encabezado de subsección y grupo que se puede plegar",
      aliases: ["h3", "encabezado3", "subencabezado", "plegable", "contraible"],
      group: "Subencabezados",
    },
    quote: {
      title: "Cita",
      subtext: "Cita o extracto",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Bloques básicos",
    },
    numbered_list: {
      title: "Lista Numerada",
      subtext: "Lista con elementos ordenados",
      aliases: ["ol", "li", "lista", "lista numerada"],
      group: "Bloques básicos",
    },
    bullet_list: {
      title: "Lista con Viñetas",
      subtext: "Lista con elementos no ordenados",
      aliases: ["ul", "li", "lista", "lista con viñetas"],
      group: "Bloques básicos",
    },
    check_list: {
      title: "Lista de Verificación",
      subtext: "Lista con casillas de verificación",
      aliases: [
        "ul",
        "li",
        "lista",
        "lista de verificación",
        "lista de chequeo",
        "checkbox",
      ],
      group: "Bloques básicos",
    },
    toggle_list: {
      title: "Lista Plegable",
      subtext: "Lista con subelementos ocultables",
      aliases: ["li", "lista", "lista plegable", "lista colapsable"],
      group: "Bloques básicos",
    },
    paragraph: {
      title: "Párrafo",
      subtext: "El cuerpo de tu documento",
      aliases: ["p", "párrafo"],
      group: "Bloques básicos",
    },
    code_block: {
      title: "Bloque de Código",
      subtext: "Bloque de código con resaltado de sintaxis",
      aliases: ["code", "pre"],
      group: "Bloques básicos",
    },
    page_break: {
      title: "Salto de página",
      subtext: "Separador de página",
      aliases: ["page", "break", "separator", "salto", "separador"],
      group: "Bloques básicos",
    },
    table: {
      title: "Tabla",
      subtext: "Tabla con celdas editables",
      aliases: ["tabla"],
      group: "Avanzado",
    },
    image: {
      title: "Imagen",
      subtext: "Imagen redimensionable con leyenda",
      aliases: [
        "imagen",
        "subir imagen",
        "cargar",
        "img",
        "foto",
        "media",
        "url",
      ],
      group: "Medios",
    },
    video: {
      title: "Vídeo",
      subtext: "Vídeo redimensionable con leyenda",
      aliases: [
        "video",
        "subir vídeo",
        "cargar",
        "mp4",
        "película",
        "media",
        "url",
      ],
      group: "Medios",
    },
    audio: {
      title: "Audio",
      subtext: "Audio incrustado con leyenda",
      aliases: [
        "audio",
        "subir audio",
        "cargar",
        "mp3",
        "sonido",
        "media",
        "url",
      ],
      group: "Medios",
    },
    file: {
      title: "Archivo",
      subtext: "Archivo incrustado",
      aliases: ["archivo", "cargar", "incrustar", "media", "url"],
      group: "Medios",
    },
    emoji: {
      title: "Emoji",
      subtext: "Busca e inserta un emoji",
      aliases: ["emoji", "emoticono", "emoción", "cara"],
      group: "Otros",
    },
    divider: {
      title: "Divisor",
      subtext: "Divisor de bloques",
      aliases: ["divisor", "hr", "horizontal rule"],
      group: "Bloques básicos",
    },
  },
  placeholders: {
    default: "Escribe o teclea '/' para comandos",
    heading: "Encabezado",
    toggleListItem: "Plegable",
    bulletListItem: "Lista",
    numberedListItem: "Lista",
    checkListItem: "Lista",
    new_comment: "Escribe un comentario...",
    edit_comment: "Editar comentario...",
    comment_reply: "Agregar comentario...",
  },
  file_blocks: {
    add_button_text: {
      image: "Agregar imagen",
      video: "Agregar vídeo",
      audio: "Agregar audio",
      file: "Agregar archivo",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "Toggle vacío. Haz clic para añadir un bloque.",
  },
  side_menu: {
    add_block_label: "Agregar bloque",
    drag_handle_label: "Abrir menú de bloque",
  },
  drag_handle: {
    delete_menuitem: "Eliminar",
    colors_menuitem: "Colores",
    header_row_menuitem: "Fila de encabezado",
    header_column_menuitem: "Columna de encabezado",
  },
  table_handle: {
    delete_column_menuitem: "Eliminar columna",
    delete_row_menuitem: "Eliminar fila",
    add_left_menuitem: "Agregar columna a la izquierda",
    add_right_menuitem: "Agregar columna a la derecha",
    add_above_menuitem: "Agregar fila arriba",
    add_below_menuitem: "Agregar fila abajo",
    split_cell_menuitem: "Dividir celda",
    merge_cells_menuitem: "Combinar celdas",
    background_color_menuitem: "Color de fondo",
  },
  suggestion_menu: {
    no_items_title: "No se encontraron elementos",
  },
  color_picker: {
    text_title: "Texto",
    background_title: "Fondo",
    colors: {
      default: "Por defecto",
      gray: "Gris",
      brown: "Marrón",
      red: "Rojo",
      orange: "Naranja",
      yellow: "Amarillo",
      green: "Verde",
      blue: "Azul",
      purple: "Morado",
      pink: "Rosa",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "Negrita",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Cursiva",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Subrayado",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Tachado",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Código",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Colores",
    },
    link: {
      tooltip: "Crear enlace",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Editar leyenda",
      input_placeholder: "Editar leyenda",
    },
    file_replace: {
      tooltip: {
        image: "Reemplazar imagen",
        video: "Reemplazar vídeo",
        audio: "Reemplazar audio",
        file: "Reemplazar archivo",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "Renombrar imagen",
        video: "Renombrar vídeo",
        audio: "Renombrar audio",
        file: "Renombrar archivo",
      } as Record<string, string>,
      input_placeholder: {
        image: "Renombrar imagen",
        video: "Renombrar vídeo",
        audio: "Renombrar audio",
        file: "Renombrar archivo",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "Descargar imagen",
        video: "Descargar vídeo",
        audio: "Descargar audio",
        file: "Descargar archivo",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "Eliminar imagen",
        video: "Eliminar vídeo",
        audio: "Eliminar audio",
        file: "Eliminar archivo",
      } as Record<string, string>,
    },
    file_preview_toggle: {
      tooltip: "Alternar vista previa",
    },
    nest: {
      tooltip: "Anidar bloque",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Desanidar bloque",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Alinear texto a la izquierda",
    },
    align_center: {
      tooltip: "Alinear texto al centro",
    },
    align_right: {
      tooltip: "Alinear texto a la derecha",
    },
    align_justify: {
      tooltip: "Justificar texto",
    },
    table_cell_merge: {
      tooltip: "Combinar celdas",
    },
    comment: {
      tooltip: "Añadir comentario",
    },
  },
  file_panel: {
    upload: {
      title: "Subir",
      file_placeholder: {
        image: "Subir imagen",
        video: "Subir vídeo",
        audio: "Subir audio",
        file: "Subir archivo",
      } as Record<string, string>,
      upload_error: "Error: Fallo en la subida",
    },
    embed: {
      title: "Incrustar",
      embed_button: {
        image: "Incrustar imagen",
        video: "Incrustar vídeo",
        audio: "Incrustar audio",
        file: "Incrustar archivo",
      } as Record<string, string>,
      url_placeholder: "Introduce la URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Eliminar enlace",
    },
    edit: {
      text: "Editar enlace",
      tooltip: "Editar",
    },
    open: {
      tooltip: "Abrir en nueva pestaña",
    },
    form: {
      title_placeholder: "Editar título",
      url_placeholder: "Editar URL",
    },
  },
  comments: {
    edited: "editado",
    save_button_text: "Guardar",
    cancel_button_text: "Cancelar",
    actions: {
      add_reaction: "Agregar reacción",
      resolve: "Resolver",
      edit_comment: "Editar comentario",
      delete_comment: "Eliminar comentario",
      more_actions: "Más acciones",
    },
    reactions: {
      reacted_by: "Reaccionado por",
    },
    sidebar: {
      marked_as_resolved: "Marcado como resuelto",
      more_replies: (count) => `${count} respuestas más`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
