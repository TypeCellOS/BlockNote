export const es = {
    slash_menu: {
      heading: {
        title: 'Encabezado 1',
        subtext: 'Encabezado de primer nivel',
        aliases: ['h', 'encabezado1', 'h1'],
        group: 'Encabezados',
      },
      heading_2: {
        title: 'Encabezado 2',
        subtext: 'Encabezado de sección principal',
        aliases: ['h2', 'encabezado2', 'subencabezado'],
        group: 'Encabezados',
      },
      heading_3: {
        title: 'Encabezado 3',
        subtext: 'Encabezado de subsección y grupo',
        aliases: ['h3', 'encabezado3', 'subencabezado'],
        group: 'Encabezados',
      },
      numbered_list: {
        title: 'Lista Numerada',
        subtext: 'Lista con elementos ordenados',
        aliases: ['ol', 'li', 'lista', 'lista numerada'],
        group: 'Bloques básicos',
      },
      bullet_list: {
        title: 'Lista con Viñetas',
        subtext: 'Lista con elementos no ordenados',
        aliases: ['ul', 'li', 'lista', 'lista con viñetas'],
        group: 'Bloques básicos',
      },
      check_list: {
        title: 'Lista de Verificación',
        subtext: 'Lista con casillas de verificación',
        aliases: ['ul', 'li', 'lista', 'lista de verificación', 'lista de chequeo', 'checkbox'],
        group: 'Bloques básicos',
      },
      paragraph: {
        title: 'Párrafo',
        subtext: 'El cuerpo de tu documento',
        aliases: ['p', 'párrafo'],
        group: 'Bloques básicos',
      },
      table: {
        title: 'Tabla',
        subtext: 'Tabla con celdas editables',
        aliases: ['tabla'],
        group: 'Avanzado',
      },
      image: {
        title: 'Imagen',
        subtext: 'Imagen redimensionable con leyenda',
        aliases: ['imagen', 'subir imagen', 'cargar', 'img', 'foto', 'media', 'url'],
        group: 'Medios',
      },
      video: {
        title: 'Vídeo',
        subtext: 'Vídeo redimensionable con leyenda',
        aliases: ['video', 'subir vídeo', 'cargar', 'mp4', 'película', 'media', 'url'],
        group: 'Medios',
      },
      audio: {
        title: 'Audio',
        subtext: 'Audio incrustado con leyenda',
        aliases: ['audio', 'subir audio', 'cargar', 'mp3', 'sonido', 'media', 'url'],
        group: 'Medios',
      },
      file: {
        title: 'Archivo',
        subtext: 'Archivo incrustado',
        aliases: ['archivo', 'cargar', 'incrustar', 'media', 'url'],
        group: 'Medios',
      },
      emoji: {
        title: 'Emoji',
        subtext: 'Busca e inserta un emoji',
        aliases: ['emoji', 'emoticono', 'emoción', 'cara'],
        group: 'Otros',
      },
    },
    placeholders: {
      default: "Escribe o teclea '/' para comandos",
      heading: 'Encabezado',
      bulletListItem: 'Lista',
      numberedListItem: 'Lista',
      checkListItem: 'Lista',
    },
    file_blocks: {
      image: {
        add_button_text: 'Agregar imagen',
      },
      video: {
        add_button_text: 'Agregar vídeo',
      },
      audio: {
        add_button_text: 'Agregar audio',
      },
      file: {
        add_button_text: 'Agregar archivo',
      },
    },
    side_menu: {
      add_block_label: 'Agregar bloque',
      drag_handle_label: 'Abrir menú de bloque',
    },
    drag_handle: {
      delete_menuitem: 'Eliminar',
      colors_menuitem: 'Colores',
    },
    table_handle: {
      delete_column_menuitem: 'Eliminar columna',
      delete_row_menuitem: 'Eliminar fila',
      add_left_menuitem: 'Agregar columna a la izquierda',
      add_right_menuitem: 'Agregar columna a la derecha',
      add_above_menuitem: 'Agregar fila arriba',
      add_below_menuitem: 'Agregar fila abajo',
    },
    suggestion_menu: {
      no_items_title: 'No se encontraron elementos',
      loading: 'Cargando…',
    },
    color_picker: {
      text_title: 'Texto',
      background_title: 'Fondo',
      colors: {
        default: 'Por defecto',
        gray: 'Gris',
        brown: 'Marrón',
        red: 'Rojo',
        orange: 'Naranja',
        yellow: 'Amarillo',
        green: 'Verde',
        blue: 'Azul',
        purple: 'Morado',
        pink: 'Rosa',
      },
    },
    formatting_toolbar: {
      bold: {
        tooltip: 'Negrita',
        secondary_tooltip: 'Mod+B',
      },
      italic: {
        tooltip: 'Cursiva',
        secondary_tooltip: 'Mod+I',
      },
      underline: {
        tooltip: 'Subrayado',
        secondary_tooltip: 'Mod+U',
      },
      strike: {
        tooltip: 'Tachado',
        secondary_tooltip: 'Mod+Shift+S',
      },
      code: {
        tooltip: 'Código',
        secondary_tooltip: '',
      },
      colors: {
        tooltip: 'Colores',
      },
      link: {
        tooltip: 'Crear enlace',
        secondary_tooltip: 'Mod+K',
      },
      file_caption: {
        tooltip: 'Editar leyenda',
        input_placeholder: 'Editar leyenda',
      },
      file_replace: {
        tooltip: {
          image: 'Reemplazar imagen',
          video: 'Reemplazar vídeo',
          audio: 'Reemplazar audio',
          file: 'Reemplazar archivo',
        } as Record<string, string>,
      },
      file_rename: {
        tooltip: {
          image: 'Renombrar imagen',
          video: 'Renombrar vídeo',
          audio: 'Renombrar audio',
          file: 'Renombrar archivo',
        } as Record<string, string>,
        input_placeholder: {
          image: 'Renombrar imagen',
          video: 'Renombrar vídeo',
          audio: 'Renombrar audio',
          file: 'Renombrar archivo',
        } as Record<string, string>,
      },
      file_download: {
        tooltip: {
          image: 'Descargar imagen',
          video: 'Descargar vídeo',
          audio: 'Descargar audio',
          file: 'Descargar archivo',
        } as Record<string, string>,
      },
      file_delete: {
        tooltip: {
          image: 'Eliminar imagen',
          video: 'Eliminar vídeo',
          audio: 'Eliminar audio',
          file: 'Eliminar archivo',
        } as Record<string, string>,
      },
      file_preview_toggle: {
        tooltip: 'Alternar vista previa',
      },
      nest: {
        tooltip: 'Anidar bloque',
        secondary_tooltip: 'Tab',
      },
      unnest: {
        tooltip: 'Desanidar bloque',
        secondary_tooltip: 'Shift+Tab',
      },
      align_left: {
        tooltip: 'Alinear texto a la izquierda',
      },
      align_center: {
        tooltip: 'Alinear texto al centro',
      },
      align_right: {
        tooltip: 'Alinear texto a la derecha',
      },
      align_justify: {
        tooltip: 'Justificar texto',
      },
    },
    file_panel: {
      upload: {
        title: 'Subir',
        file_placeholder: {
          image: 'Subir imagen',
          video: 'Subir vídeo',
          audio: 'Subir audio',
          file: 'Subir archivo',
        } as Record<string, string>,
        upload_error: 'Error: Fallo en la subida',
      },
      embed: {
        title: 'Incrustar',
        embed_button: {
          image: 'Incrustar imagen',
          video: 'Incrustar vídeo',
          audio: 'Incrustar audio',
          file: 'Incrustar archivo',
        } as Record<string, string>,
        url_placeholder: 'Introduce la URL',
      },
    },
    link_toolbar: {
      delete: {
        tooltip: 'Eliminar enlace',
      },
      edit: {
        text: 'Editar enlace',
        tooltip: 'Editar',
      },
      open: {
        tooltip: 'Abrir en nueva pestaña',
      },
      form: {
        title_placeholder: 'Editar título',
        url_placeholder: 'Editar URL',
      },
    },
    generic: {
      ctrl_shortcut: 'Ctrl',
    },
  };
  