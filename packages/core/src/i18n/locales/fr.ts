import { Dictionary } from "../dictionary.js";

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
      subtext: "Titre de deuxième niveau Utilisé pour les sections clés",
      aliases: ["h2", "titre2", "sous-titre"],
      group: "Titres",
    },
    heading_3: {
      title: "Titre 3",
      subtext:
        "Titre de troisième niveau utilisé pour les sous-sections et les titres de groupe",
      aliases: ["h3", "titre3", "sous-titre"],
      group: "Titres",
    },
    heading_4: {
      title: "Titre 4",
      subtext: "Titre de sous‑section mineure",
      aliases: ["h4", "titre4", "sous‑titre4"],
      group: "Sous-titres",
    },
    heading_5: {
      title: "Titre 5",
      subtext: "Titre de sous-section mineure",
      aliases: ["h5", "titre5", "sous-titre5"],
      group: "Sous-titres",
    },
    heading_6: {
      title: "Titre 6",
      subtext: "Titre de niveau le plus bas",
      aliases: ["h6", "titre6", "sous-titre6"],
      group: "Sous-titres",
    },
    toggle_heading: {
      title: "Titre Repliable 1",
      subtext:
        "Titre de premier niveau qui peut être replié pour masquer son contenu",
      aliases: ["h", "titre1", "h1", "repliable", "masquable", "déroulant"],
      group: "Sous-titres",
    },
    toggle_heading_2: {
      title: "Titre Repliable 2",
      subtext: "Titre de section qui peut être replié pour masquer son contenu",
      aliases: [
        "h2",
        "titre2",
        "sous-titre",
        "repliable",
        "masquable",
        "déroulant",
      ],
      group: "Sous-titres",
    },
    toggle_heading_3: {
      title: "Titre Repliable 3",
      subtext:
        "Titre de sous-section qui peut être replié pour masquer son contenu",
      aliases: [
        "h3",
        "titre3",
        "sous-titre",
        "repliable",
        "masquable",
        "déroulant",
      ],
      group: "Sous-titres",
    },
    quote: {
      title: "Citation",
      subtext: "Citation ou extrait",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Blocs de base",
    },
    numbered_list: {
      title: "Liste Numérotée",
      subtext: "Utilisé pour afficher une liste numérotée",
      aliases: ["ol", "li", "liste", "listenumérotée", "liste numérotée"],
      group: "Blocs de base",
    },
    bullet_list: {
      title: "Liste à puces",
      subtext: "Utilisé pour afficher une liste à puce non numérotée",
      aliases: [
        "ul",
        "li",
        "liste",
        "listeàpuces",
        "liste à puces",
        "bullet points",
        "bulletpoints",
      ],
      group: "Blocs de base",
    },
    check_list: {
      title: "Liste de tâches",
      subtext: "Utilisé pour afficher une liste avec des cases à cocher",
      aliases: [
        "ul",
        "li",
        "liste",
        "liste de vérification",
        "liste cochée",
        "case à cocher",
        "checklist",
        "checkbox",
        "check box",
        "to do",
        "todo",
      ],
      group: "Blocs de base",
    },
    toggle_list: {
      title: "Liste repliable",
      subtext: "Liste avec des sous-éléments masquables",
      aliases: [
        "li",
        "liste",
        "liste pliable",
        "liste escamotable",
        "liste repliable",
      ],
      group: "Blocs de base",
    },
    paragraph: {
      title: "Paragraphe",
      subtext: "Utilisé pour le corps de votre document",
      aliases: ["p", "paragraphe", "texte"],
      group: "Blocs de base",
    },
    code_block: {
      title: "Bloc de code",
      subtext: "Bloc de code avec coloration syntaxique",
      aliases: ["code", "pre"],
      group: "Blocs de base",
    },
    page_break: {
      title: "Saut de page",
      subtext: "Séparateur de page",
      aliases: ["page", "break", "separator", "saut", "séparateur"],
      group: "Blocs de base",
    },
    table: {
      title: "Tableau",
      subtext: "Utilisé pour les tableaux",
      aliases: ["tableau", "grille"],
      group: "Avancé",
    },
    image: {
      title: "Image",
      subtext: "Insérer une image",
      aliases: [
        "image",
        "uploadImage",
        "télécharger image",
        "téléverser image",
        "uploader image",
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
        "télécharger vidéo",
        "téléverser vidéo",
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
        "télécharger audio",
        "téléverser audio",
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
      aliases: [
        "fichier",
        "téléverser fichier",
        "intégrer fichier",
        "insérer fichier",
        "média",
        "url",
      ],
      group: "Média",
    },
    emoji: {
      title: "Emoji",
      subtext: "Utilisé pour insérer un emoji",
      aliases: ["emoji", "émoticône", "émotion", "visage", "smiley"],
      group: "Autres",
    },
    divider: {
      title: "Diviseur",
      subtext: "Utilisé pour diviser les blocs",
      aliases: ["diviseur", "hr", "horizontal rule"],
      group: "Blocs de base",
    },
  },
  placeholders: {
    default:
      "Entrez du texte ou tapez '/' pour faire apparaître les options de mise en page",
    heading: "Titre",
    toggleListItem: "Basculer",
    bulletListItem: "Liste",
    numberedListItem: "Liste",
    checkListItem: "Liste",
    new_comment: "Écrire un commentaire...",
    edit_comment: "Modifier le commentaire...",
    comment_reply: "Ajouter un commentaire...",
  },
  file_blocks: {
    add_button_text: {
      image: "Ajouter une image",
      video: "Ajouter une vidéo",
      audio: "Ajouter un audio",
      file: "Ajouter un fichier",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "Toggle vide. Cliquez pour ajouter un bloc.",
  },
  // from react package:
  side_menu: {
    add_block_label: "Ajouter un bloc",
    drag_handle_label: "Ouvrir le menu du bloc",
  },
  drag_handle: {
    delete_menuitem: "Supprimer",
    colors_menuitem: "Couleurs",
    header_row_menuitem: "En-tête de ligne",
    header_column_menuitem: "En-tête de colonne",
  },
  table_handle: {
    delete_column_menuitem: "Supprimer la colonne",
    delete_row_menuitem: "Supprimer la ligne",
    add_left_menuitem: "Ajouter une colonne à gauche",
    add_right_menuitem: "Ajouter une colonne à droite",
    add_above_menuitem: "Ajouter une ligne au-dessus",
    add_below_menuitem: "Ajouter une ligne en dessous",
    split_cell_menuitem: "Diviser la cellule",
    merge_cells_menuitem: "Fusionner les cellules",
    background_color_menuitem: "Couleur de fond",
  },
  suggestion_menu: {
    no_items_title: "Aucun élément trouvé",
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
      tooltip: "Augmenter le retrait du bloc",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Diminuer le retait du bloc",
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
    table_cell_merge: {
      tooltip: "Fusionner les cellules",
    },
    comment: {
      tooltip: "Ajouter un commentaire",
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
      upload_error: "Erreur : échec du téléchargement",
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
  comments: {
    edited: "modifié",
    save_button_text: "Enregistrer",
    cancel_button_text: "Annuler",
    actions: {
      add_reaction: "Ajouter une réaction",
      resolve: "Résoudre",
      edit_comment: "Modifier le commentaire",
      delete_comment: "Supprimer le commentaire",
      more_actions: "Plus d'actions",
    },
    reactions: {
      reacted_by: "Réagi par",
    },
    sidebar: {
      marked_as_resolved: "Marqué comme résolu",
      more_replies: (count) => `${count} réponses de plus`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
