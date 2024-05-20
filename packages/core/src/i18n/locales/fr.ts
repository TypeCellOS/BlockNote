import { Dictionary } from "../dictionary";

export const fr: Dictionary = {
  slash_menu: {
    heading: {
      title: "Titre 1",
      subtext: "Utilisé pour un titre de premier niveau",
      aliases: ["h", "titre1", "h1"],
      group: "Titres",
    },
    heading_2: {
      title: "Titre 2",
      subtext: "Utilisé pour les sections clés",
      aliases: ["h2", "titre2", "sous-titre"],
      group: "Titres",
    },
    heading_3: {
      title: "Titre 3",
      subtext: "Utilisé pour les sous-sections et les titres de groupe",
      aliases: ["h3", "titre3", "sous-titre"],
      group: "Titres",
    },
    numbered_list: {
      title: "Liste Numérotée",
      subtext: "Utilisé pour afficher une liste numérotée",
      aliases: ["ol", "li", "liste", "listenumérotée", "liste numérotée"],
      group: "Blocs de base",
    },
    bullet_list: {
      title: "Liste à Puces",
      subtext: "Utilisé pour afficher une liste non ordonnée",
      aliases: ["ul", "li", "liste", "listeàpuces", "liste à puces"],
      group: "Blocs de base",
    },
    paragraph: {
      title: "Paragraphe",
      subtext: "Utilisé pour le corps de votre document",
      aliases: ["p", "paragraphe"],
      group: "Blocs de base",
    },
    table: {
      title: "Tableau",
      subtext: "Utilisé pour les tableaux",
      aliases: ["tableau"],
      group: "Avancé",
    },
    image: {
      title: "Image",
      subtext: "Insérer une image",
      aliases: [
        "image",
        "uploadImage",
        "télécharger",
        "img",
        "photo",
        "média",
        "url",
        "drive",
        "dropbox",
      ],
      group: "Médias",
    },
    // TODO
    video: {
      title: "Video",
      subtext: "Insert a video",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
        "drive",
        "dropbox",
      ],
      group: "Media",
    },
    audio: {
      title: "Audio",
      subtext: "Insert audio",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
        "drive",
        "dropbox",
      ],
      group: "Media",
    },
    file: {
      title: "File",
      subtext: "Insert a file",
      aliases: ["file", "upload", "embed", "media", "url"],
      group: "Media",
    },
  },
  placeholders: {
    default: "Entrez du texte ou tapez '/' pour les commandes",
    heading: "Titre",
    bulletListItem: "Liste",
    numberedListItem: "Liste",
  },
  // TODO
  file_blocks: {
    image: {
      add_button_text: "Add image",
    },
    video: {
      add_button_text: "Add video",
    },
    audio: {
      add_button_text: "Add audio",
    },
    file: {
      add_button_text: "Add file",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "Ajouter un bloc",
    drag_handle_label: "Ouvrir le menu du bloc",
  },
  drag_handle: {
    delete_menuitem: "Supprimer",
    colors_menuitem: "Couleurs",
  },
  table_handle: {
    delete_column_menuitem: "Supprimer la colonne",
    delete_row_menuitem: "Supprimer la ligne",
    add_left_menuitem: "Ajouter une colonne à gauche",
    add_right_menuitem: "Ajouter une colonne à droite",
    add_above_menuitem: "Ajouter une ligne au-dessus",
    add_below_menuitem: "Ajouter une ligne en dessous",
  },
  suggestion_menu: {
    no_items_title: "Aucun élément trouvé",
    loading: "Chargement…",
  },
  color_picker: {
    text_title: "Texte",
    background_title: "Fond",
    colors: {
      default: "Défaut",
      gray: "Gris",
      brown: "Marron",
      red: "Rouge",
      orange: "Orange",
      yellow: "Jaune",
      green: "Vert",
      blue: "Bleu",
      purple: "Violet",
      pink: "Rose",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Gras",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Italique",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Souligner",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Barré",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Code",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Couleurs",
    },
    link: {
      tooltip: "Créer un lien",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Modifier la légende",
      input_placeholder: "Modifier la légende",
    },
    // TODO
    file_replace: {
      tooltip: {
        image: "Replace image",
        video: "Replace video",
        audio: "Replace audio",
        file: "Replace file",
      },
    },
    file_rename: {
      tooltip: {
        image: "Rename image",
        video: "Rename video",
        audio: "Rename audio",
        file: "Rename file",
      },
      input_placeholder: {
        image: "Rename image",
        video: "Rename video",
        audio: "Rename audio",
        file: "Rename file",
      },
    },
    file_download: {
      tooltip: {
        image: "Download image",
        video: "Download video",
        audio: "Download audio",
        file: "Download file",
      },
    },
    file_delete: {
      tooltip: {
        image: "Delete image",
        video: "Delete video",
        audio: "Delete audio",
        file: "Delete file",
      },
    },
    file_preview_toggle: {
      tooltip: "Toggle preview",
    },
    nest: {
      tooltip: "Emboîter le bloc",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Démboîter le bloc",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Aligner le texte à gauche",
    },
    align_center: {
      tooltip: "Aligner le texte au centre",
    },
    align_right: {
      tooltip: "Aligner le texte à droite",
    },
    align_justify: {
      tooltip: "Justifier le texte",
    },
  },
  file_panel: {
    upload: {
      title: "Télécharger",
      // TODO
      file_placeholder: {
        image: "Upload image",
        video: "Upload video",
        audio: "Upload audio",
        file: "Upload file",
      },
      upload_error: "Erreur : Échec du téléchargement",
    },
    embed: {
      title: "Intégrer",
      // TODO
      embed_button: {
        image: "Embed image",
        video: "Embed video",
        audio: "Embed audio",
        file: "Embed file",
      },
      url_placeholder: "Entrez l'URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Supprimer le lien",
    },
    edit: {
      text: "Modifier le lien",
      tooltip: "Modifier",
    },
    open: {
      tooltip: "Ouvrir dans un nouvel onglet",
    },
    form: {
      title_placeholder: "Modifier le titre",
      url_placeholder: "Modifier l'URL",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
