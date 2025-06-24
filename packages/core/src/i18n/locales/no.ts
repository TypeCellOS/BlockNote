import { Dictionary } from "../dictionary.js";

export const no: Dictionary = {
  slash_menu: {
    heading: {
      title: "Overskrift 1",
      subtext: "Toppnivåoverskrift",
      aliases: ["h", "overskrift1", "h1"],
      group: "Overskrifter",
    },
    heading_2: {
      title: "Overskrift 2",
      subtext: "Hovedseksjonsoverskrift",
      aliases: ["h2", "overskrift2", "underoverskrift"],
      group: "Overskrifter",
    },
    heading_3: {
      title: "Overskrift 3",
      subtext: "Underseksjon og gruppeoverskrift",
      aliases: ["h3", "overskrift3", "underoverskrift"],
      group: "Overskrifter",
    },
    heading_4: {
      title: "Overskrift 4",
      subtext: "Underoverskrift for mindre underseksjoner",
      aliases: ["h4", "overskrift4", "underoverskrift4"],
      group: "Underoverskrifter",
    },
    heading_5: {
      title: "Overskrift 5",
      subtext: "Overskrift for mindre underseksjoner",
      aliases: ["h5", "overskrift5", "underoverskrift5"],
      group: "Underoverskrifter",
    },
    heading_6: {
      title: "Overskrift 6",
      subtext: "Overskrift på laveste nivå",
      aliases: ["h6", "overskrift6", "underoverskrift6"],
      group: "Underoverskrifter",
    },
    toggle_heading: {
      title: "Sammenleggbar Overskrift 1",
      subtext: "Toppnivåoverskrift som kan vises eller skjules",
      aliases: ["h", "overskrift1", "h1", "sammenleggbar", "toggle"],
      group: "Underoverskrifter",
    },
    toggle_heading_2: {
      title: "Sammenleggbar Overskrift 2",
      subtext: "Hovedseksjonsoverskrift som kan vises eller skjules",
      aliases: [
        "h2",
        "overskrift2",
        "underoverskrift",
        "sammenleggbar",
        "toggle",
      ],
      group: "Underoverskrifter",
    },
    toggle_heading_3: {
      title: "Sammenleggbar Overskrift 3",
      subtext: "Underseksjonsoverskrift som kan vises eller skjules",
      aliases: [
        "h3",
        "overskrift3",
        "underoverskrift",
        "sammenleggbar",
        "toggle",
      ],
      group: "Underoverskrifter",
    },
    quote: {
      title: "Sitat",
      subtext: "Sitat eller utdrag",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Grunnleggende blokker",
    },
    numbered_list: {
      title: "Nummerert liste",
      subtext: "Liste med ordnede elementer",
      aliases: ["ol", "li", "liste", "nummerertliste", "nummerert liste"],
      group: "Grunnleggende blokker",
    },
    bullet_list: {
      title: "Punktliste",
      subtext: "Liste med uordnede elementer",
      aliases: ["ul", "li", "liste", "punktliste", "punkt liste"],
      group: "Grunnleggende blokker",
    },
    check_list: {
      title: "Sjekkliste",
      subtext: "Liste med avmerkingsbokser",
      aliases: [
        "ul",
        "li",
        "liste",
        "sjekkliste",
        "sjekk liste",
        "avmerket liste",
        "avmerkingsboks",
      ],
      group: "Grunnleggende blokker",
    },
    toggle_list: {
      title: "Sammenleggbar liste",
      subtext: "Liste med skjulbare underpunkter",
      aliases: [
        "li",
        "liste",
        "sammenleggbar liste",
        "skjulbar liste",
        "sammenleggbar liste",
      ],
      group: "Grunnleggende blokker",
    },
    paragraph: {
      title: "Avsnitt",
      subtext: "Hoveddelen av dokumentet ditt",
      aliases: ["p", "avsnitt"],
      group: "Grunnleggende blokker",
    },
    code_block: {
      title: "Kodeblokk",
      subtext: "Kodeblokk med syntaksfremheving",
      aliases: ["kode", "pre"],
      group: "Grunnleggende blokker",
    },
    page_break: {
      title: "Sideskift",
      subtext: "Sideskilletegn",
      aliases: ["side", "skift", "skilletegn"],
      group: "Grunnleggende blokker",
    },
    table: {
      title: "Tabell",
      subtext: "Tabell med redigerbare celler",
      aliases: ["tabell"],
      group: "Avansert",
    },
    image: {
      title: "Bilde",
      subtext: "Justerbart bilde med bildetekst",
      aliases: [
        "bilde",
        "bildeopplasting",
        "opplasting",
        "img",
        "bilde",
        "media",
        "url",
      ],
      group: "Media",
    },
    video: {
      title: "Video",
      subtext: "Justerbar video med bildetekst",
      aliases: [
        "video",
        "videoopplasting",
        "opplasting",
        "mp4",
        "film",
        "media",
        "url",
      ],
      group: "Media",
    },
    audio: {
      title: "Lyd",
      subtext: "legg til lyd med bildetekst",
      aliases: [
        "lyd",
        "lydopplasting",
        "opplasting",
        "mp3",
        "lyd",
        "media",
        "url",
      ],
      group: "Media",
    },
    file: {
      title: "Fil",
      subtext: "Innebygd fil",
      aliases: ["fil", "opplasting", "innebygd", "media", "url"],
      group: "Media",
    },
    emoji: {
      title: "Emoji",
      subtext: "Søk etter og legg til en emoji",
      aliases: ["emoji", "emote", "emosjon", "ansikt"],
      group: "Andre",
    },
  },
  placeholders: {
    default: "Skriv tekst eller skriv '/' for å vise kommandoer",
    heading: "Overskrift",
    toggleListItem: "Veksle",
    bulletListItem: "Liste",
    numberedListItem: "Liste",
    checkListItem: "Liste",
    new_comment: "Skriv en kommentar...",
    edit_comment: "Rediger kommentar...",
    comment_reply: "Legg til kommentar...",
  },
  file_blocks: {
    image: {
      add_button_text: "Legg til bilde",
    },
    video: {
      add_button_text: "Legg til video",
    },
    audio: {
      add_button_text: "Legg til lyd",
    },
    file: {
      add_button_text: "Legg til fil",
    },
  },
  side_menu: {
    add_block_label: "Legg til blokk",
    drag_handle_label: "Åpne blokkmeny",
  },
  drag_handle: {
    delete_menuitem: "Slett",
    colors_menuitem: "Farger",
    header_row_menuitem: "Rad overskrift",
    header_column_menuitem: "Kolonne overskrift",
  },
  table_handle: {
    delete_column_menuitem: "Slett kolonne",
    delete_row_menuitem: "Slett rad",
    add_left_menuitem: "Legg til kolonne til venstre",
    add_right_menuitem: "Legg til kolonne til høyre",
    add_above_menuitem: "Legg til rad over",
    add_below_menuitem: "Legg til rad under",
    split_cell_menuitem: "Del celle",
    merge_cells_menuitem: "Slå sammen celler",
    background_color_menuitem: "Bakgrunnsfarge",
  },
  suggestion_menu: {
    no_items_title: "Ingen elementer funnet",
  },
  color_picker: {
    text_title: "Tekst",
    background_title: "Bakgrunn",
    colors: {
      default: "Standard",
      gray: "Grå",
      brown: "Brun",
      red: "Rød",
      orange: "Oransje",
      yellow: "Gul",
      green: "Grønn",
      blue: "Blå",
      purple: "Lilla",
      pink: "Rosa",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "Fet",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Kursiv",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Understrek",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Gjennomstrek",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Kode",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Farger",
    },
    link: {
      tooltip: "Opprett lenke",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Rediger bildetekst",
      input_placeholder: "Rediger bildetekst",
    },
    file_replace: {
      tooltip: {
        image: "Bytt ut bilde",
        video: "Bytt ut video",
        audio: "Bytt ut lyd",
        file: "Bytt ut fil",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "Endre navn på bilde",
        video: "Endre navn på video",
        audio: "Endre navn på lyd",
        file: "Endre navn på fil",
      } as Record<string, string>,
      input_placeholder: {
        image: "Endre navn på bilde",
        video: "Endre navn på video",
        audio: "Endre navn på lyd",
        file: "Endre navn på fil",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "Last ned bilde",
        video: "Last ned video",
        audio: "Last ned lyd",
        file: "Last ned fil",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "Slett bilde",
        video: "Slett video",
        audio: "Slett lyd",
        file: "Slett fil",
      } as Record<string, string>,
    },
    file_preview_toggle: {
      tooltip: "Veksle forhåndsvisning",
    },
    nest: {
      tooltip: "Plasser blokk inni",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Ta blokk ut",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Venstrejuster tekst",
    },
    align_center: {
      tooltip: "Midtstill tekst",
    },
    align_right: {
      tooltip: "Høyrejuster tekst",
    },
    align_justify: {
      tooltip: "Juster tekst",
    },
    comment: {
      tooltip: "Legg til kommentar",
    },
    table_cell_merge: {
      tooltip: "Slå sammen celler",
    },
  },
  file_panel: {
    upload: {
      title: "Last opp",
      file_placeholder: {
        image: "Last opp bilde",
        video: "Last opp video",
        audio: "Last opp lyd",
        file: "Last opp fil",
      } as Record<string, string>,
      upload_error: "Feil: Opplasting mislyktes",
    },
    embed: {
      title: "Bygg inn",
      embed_button: {
        image: "Bygg inn bilde",
        video: "Bygg inn video",
        audio: "Bygg inn lyd",
        file: "Bygg inn fil",
      } as Record<string, string>,
      url_placeholder: "Skriv inn URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Fjern lenke",
    },
    edit: {
      text: "Rediger lenke",
      tooltip: "Rediger",
    },
    open: {
      tooltip: "Åpne i ny fane",
    },
    form: {
      title_placeholder: "Rediger tittel",
      url_placeholder: "Rediger URL",
    },
  },
  comments: {
    edited: "redigert",
    save_button_text: "Lagre",
    cancel_button_text: "Avbryt",
    actions: {
      add_reaction: "Legg til reaksjon",
      resolve: "Løs",
      edit_comment: "Rediger kommentar",
      delete_comment: "Slett kommentar",
      more_actions: "Flere handlinger",
    },
    reactions: {
      reacted_by: "Reagert av",
    },
    sidebar: {
      marked_as_resolved: "Merket som løst",
      more_replies: (count) => `${count} flere svar`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
