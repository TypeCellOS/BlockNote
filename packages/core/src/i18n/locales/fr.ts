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
    check_list: {
      title: "Liste de vérification",
      subtext: "Utilisé pour afficher une liste avec des cases à cocher",
      aliases: [
        "ul",
        "li",
        "liste",
        "liste de vérification",
        "liste cochée",
        "case à cocher",
      ],
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
      ],
      group: "Médias",
    },
    video: {
      title: "Vidéo",
      subtext: "Insérer une vidéo",
      aliases: [
        "vidéo",
        "téléchargerVidéo",
        "téléverser",
        "mp4",
        "film",
        "média",
        "url",
      ],
      group: "Média",
    },
    audio: {
      title: "Audio",
      subtext: "Insérer un audio",
      aliases: [
        "audio",
        "téléchargerAudio",
        "téléverser",
        "mp3",
        "son",
        "média",
        "url",
      ],
      group: "Média",
    },
    file: {
      title: "Fichier",
      subtext: "Insérer un fichier",
      aliases: ["fichier", "téléverser", "intégrer", "média", "url"],
      group: "Média",
    },
    emoji: {
      title: "Emoji",
      subtext: "Utilisé pour insérer un emoji",
      aliases: ["emoji", "émoticône", "émotion", "visage"],
      group: "Autres",
    },
  },
  placeholders: {
    default: "Entrez du texte ou tapez '/' pour les commandes",
    heading: "Titre",
    bulletListItem: "Liste",
    numberedListItem: "Liste",
    checkListItem: "Liste",
  },
  file_blocks: {
    image: {
      add_button_text: "Ajouter une image",
    },
    video: {
      add_button_text: "Ajouter une vidéo",
    },
    audio: {
      add_button_text: "Ajouter un audio",
    },
    file: {
      add_button_text: "Ajouter un fichier",
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
    file_replace: {
      tooltip: {
        image: "Remplacer l'image",
        video: "Remplacer la vidéo",
        audio: "Remplacer l'audio",
        file: "Remplacer le fichier",
      },
    },
    file_rename: {
      tooltip: {
        image: "Renommer l'image",
        video: "Renommer la vidéo",
        audio: "Renommer l'audio",
        file: "Renommer le fichier",
      },
      input_placeholder: {
        image: "Renommer l'image",
        video: "Renommer la vidéo",
        audio: "Renommer l'audio",
        file: "Renommer le fichier",
      },
    },
    file_download: {
      tooltip: {
        image: "Télécharger l'image",
        video: "Télécharger la vidéo",
        audio: "Télécharger l'audio",
        file: "Télécharger le fichier",
      },
    },
    file_delete: {
      tooltip: {
        image: "Supprimer l'image",
        video: "Supprimer la vidéo",
        audio: "Supprimer l'audio",
        file: "Supprimer le fichier",
      },
    },
    file_preview_toggle: {
      tooltip: "Basculer l'aperçu",
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
      file_placeholder: {
        image: "Télécharger une image",
        video: "Télécharger une vidéo",
        audio: "Télécharger un fichier audio",
        file: "Télécharger un fichier",
      },
      upload_error: "Erreur : Échec du téléchargement",
    },
    embed: {
      title: "Intégrer",
      embed_button: {
        image: "Intégrer une image",
        video: "Intégrer une vidéo",
        audio: "Intégrer un fichier audio",
        file: "Intégrer un fichier",
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
