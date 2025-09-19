export const sk = {
  slash_menu: {
    heading: {
      title: "Nadpis 1",
      subtext: "Nadpis najvyššej úrovne",
      aliases: ["h", "nadpis1", "h1"],
      group: "Nadpisy",
    },
    heading_2: {
      title: "Nadpis 2",
      subtext: "Kľúčový nadpis sekcie",
      aliases: ["h2", "nadpis2", "podnadpis"],
      group: "Nadpisy",
    },
    heading_3: {
      title: "Nadpis 3",
      subtext: "Podsekcia alebo skupinový nadpis",
      aliases: ["h3", "nadpis3", "podnadpis"],
      group: "Nadpisy",
    },
    heading_4: {
      title: "Nadpis 4",
      subtext: "Podsekcia alebo skupinový nadpis",
      aliases: ["h4", "nadpis4", "podnadpis"],
      group: "Podnáslovi",
    },
    heading_5: {
      title: "Nadpis 5",
      subtext: "Podsekcia alebo skupinový nadpis",
      aliases: ["h5", "nadpis5", "podnadpis"],
      group: "Podnáslovi",
    },
    heading_6: {
      title: "Nadpis 6",
      subtext: "Podsekcia alebo skupinový nadpis",
      aliases: ["h6", "nadpis6", "podnadpis"],
      group: "Podnáslovi",
    },
    toggle_heading: {
      title: "Rozbaľovací Nadpis 1",
      subtext: "Rozbaľovací nadpis najvyššej úrovne",
      aliases: ["h", "nadpis1", "h1", "rozbaľovací"],
      group: "Podnáslovi",
    },
    toggle_heading_2: {
      title: "Rozbaľovací Nadpis 2",
      subtext: "Rozbaľovací kľúčový nadpis sekcie",
      aliases: ["h2", "nadpis2", "podnadpis", "rozbaľovací"],
      group: "Podnáslovi",
    },
    toggle_heading_3: {
      title: "Rozbaľovací Nadpis 3",
      subtext: "Rozbaľovací nadpis podsekcie alebo skupiny",
      aliases: ["h3", "nadpis3", "podnadpis", "rozbaľovací"],
      group: "Podnáslovi",
    },
    quote: {
      title: "Citát",
      subtext: "Citát alebo výňatok",
      aliases: ["citácia", "blockquote", "bq"],
      group: "Základné bloky",
    },
    numbered_list: {
      title: "Číslovaný zoznam",
      subtext: "Zoznam s očíslovanými položkami",
      aliases: ["ol", "li", "zoznam", "číslovanýzoznam", "číslovaný zoznam"],
      group: "Základné bloky",
    },
    bullet_list: {
      title: "Odrážkový zoznam",
      subtext: "Zoznam s nečíslovanými položkami",
      aliases: ["ul", "li", "zoznam", "odrážkovýzoznam", "odrážkový zoznam"],
      group: "Základné bloky",
    },
    check_list: {
      title: "Kontrolný zoznam",
      subtext: "Zoznam s checkboxmi",
      aliases: [
        "ul",
        "li",
        "zoznam",
        "kontrolnýzoznam",
        "kontrolný zoznam",
        "zaškrtnutý zoznam",
        "checkbox",
      ],
      group: "Základné bloky",
    },
    toggle_list: {
      title: "Rozbaľovací zoznam",
      subtext: "Zoznam so skrývateľnými položkami",
      aliases: ["li", "zoznam", "rozbaľovací zoznam", "zabaliteľný zoznam"],
      group: "Základné bloky",
    },
    paragraph: {
      title: "Odstavec",
      subtext: "Telo dokumentu",
      aliases: ["p", "odstavec"],
      group: "Základné bloky",
    },
    code_block: {
      title: "Blok kódu",
      subtext: "Blok kódu so zvýraznením syntaxe",
      aliases: ["kód", "pre"],
      group: "Základné bloky",
    },
    page_break: {
      title: "Zlom strany",
      subtext: "Oddeľovač strán",
      aliases: ["strana", "zlom", "oddeľovač"],
      group: "Základné bloky",
    },
    table: {
      title: "Tabuľka",
      subtext: "Tabuľka s editovateľnými bunkami",
      aliases: ["tabuľka"],
      group: "Pokročilé",
    },
    image: {
      title: "Obrázok",
      subtext: "Meniteľný obrázok s popisom",
      aliases: [
        "obrázok",
        "nahratieObrázka",
        "nahratie",
        "img",
        "obrázok",
        "média",
        "url",
      ],
      group: "Médiá",
    },
    video: {
      title: "Video",
      subtext: "Meniteľné video s popisom",
      aliases: [
        "video",
        "nahratieVidea",
        "nahratie",
        "mp4",
        "film",
        "média",
        "url",
      ],
      group: "Médiá",
    },
    audio: {
      title: "Audio",
      subtext: "Vložený zvuk s popisom",
      aliases: [
        "audio",
        "nahratieAudia",
        "nahratie",
        "mp3",
        "zvuk",
        "média",
        "url",
      ],
      group: "Médiá",
    },
    file: {
      title: "Súbor",
      subtext: "Vložený súbor",
      aliases: ["súbor", "nahratie", "vloženie", "média", "url"],
      group: "Médiá",
    },
    emoji: {
      title: "Emoji",
      subtext: "Vyhľadať a vložiť emoji",
      aliases: ["emoji", "emócia", "tvár"],
      group: "Ostatné",
    },
    divider: {
      title: "Oddelovač",
      subtext: "Oddelovač blokov",
      aliases: ["oddelovač", "hr", "horizontal rule"],
      group: "Základné bloky",
    },
  },
  placeholders: {
    default: "Zadajte text alebo napíšte '/' pre príkazy",
    heading: "Nadpis",
    toggleListItem: "Prepnúť",
    bulletListItem: "Zoznam",
    numberedListItem: "Zoznam",
    checkListItem: "Zoznam",
    emptyDocument: undefined,
    new_comment: "Napíšte komentár...",
    edit_comment: "Upravte komentár...",
    comment_reply: "Pridať komentár...",
  } as Record<string | "default" | "emptyDocument", string | undefined>,
  file_blocks: {
    add_button_text: {
      image: "Pridať obrázok",
      video: "Pridať video",
      audio: "Pridať audio",
      file: "Pridať súbor",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "Prázdne prepínanie. Kliknite pre pridanie bloku.",
  },
  side_menu: {
    add_block_label: "Pridať blok",
    drag_handle_label: "Otvoriť menu bloku",
  },
  drag_handle: {
    delete_menuitem: "Vymazať",
    colors_menuitem: "Farby",
    header_row_menuitem: "Hlavičkový riadok",
    header_column_menuitem: "Hlavičkový stĺpec",
  },
  table_handle: {
    delete_column_menuitem: "Vymazať stĺpec",
    delete_row_menuitem: "Vymazať riadok",
    add_left_menuitem: "Pridať stĺpec vľavo",
    add_right_menuitem: "Pridať stĺpec vpravo",
    add_above_menuitem: "Pridať riadok nad",
    add_below_menuitem: "Pridať riadok pod",
    split_cell_menuitem: "Rozdeliť bunku",
    merge_cells_menuitem: "Zlúčiť bunky",
    background_color_menuitem: "Farba pozadia",
  },
  suggestion_menu: {
    no_items_title: "Nenašli sa žiadne položky",
  },
  color_picker: {
    text_title: "Text",
    background_title: "Pozadie",
    colors: {
      default: "Predvolená",
      gray: "Sivá",
      brown: "Hnedá",
      red: "Červená",
      orange: "Oranžová",
      yellow: "Žltá",
      green: "Zelená",
      blue: "Modrá",
      purple: "Fialová",
      pink: "Ružová",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "Tučné",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Kurzíva",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Podčiarknuté",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Prečiarknuté",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Kód",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Farby",
    },
    link: {
      tooltip: "Vytvoriť odkaz",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Upraviť popis",
      input_placeholder: "Upraviť popis",
    },
    file_replace: {
      tooltip: {
        image: "Nahradiť obrázok",
        video: "Nahradiť video",
        audio: "Nahradiť audio",
        file: "Nahradiť súbor",
      },
    },
    file_rename: {
      tooltip: {
        image: "Premenovať obrázok",
        video: "Premenovať video",
        audio: "Premenovať audio",
        file: "Premenovať súbor",
      },
      input_placeholder: {
        image: "Premenovať obrázok",
        video: "Premenovať video",
        audio: "Premenovať audio",
        file: "Premenovať súbor",
      },
    },
    file_download: {
      tooltip: {
        image: "Stiahnuť obrázok",
        video: "Stiahnuť video",
        audio: "Stiahnuť audio",
        file: "Stiahnuť súbor",
      },
    },
    file_delete: {
      tooltip: {
        image: "Vymazať obrázok",
        video: "Vymazať video",
        audio: "Vymazať audio",
        file: "Vymazať súbor",
      },
    },
    file_preview_toggle: {
      tooltip: "Prepnúť náhľad",
    },
    nest: {
      tooltip: "Zarovnať blok",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Odzarovnať blok",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Zarovnať text vľavo",
    },
    align_center: {
      tooltip: "Zarovnať text na stred",
    },
    align_right: {
      tooltip: "Zarovnať text vpravo",
    },
    align_justify: {
      tooltip: "Zarovnať text do bloku",
    },
    table_cell_merge: {
      tooltip: "Zlúčiť bunky",
    },
    comment: {
      tooltip: "Pridať komentár",
    },
  },
  file_panel: {
    upload: {
      title: "Nahratie",
      file_placeholder: {
        image: "Nahrať obrázok",
        video: "Nahrať video",
        audio: "Nahrať audio",
        file: "Nahrať súbor",
      },
      upload_error: "Chyba: Nahratie zlyhalo",
    },
    embed: {
      title: "Vložiť",
      embed_button: {
        image: "Vložiť obrázok",
        video: "Vložiť video",
        audio: "Vložiť audio",
        file: "Vložiť súbor",
      },
      url_placeholder: "Zadajte URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Odstrániť odkaz",
    },
    edit: {
      text: "Upraviť odkaz",
      tooltip: "Upraviť",
    },
    open: {
      tooltip: "Otvoriť v novom okne",
    },
    form: {
      title_placeholder: "Upraviť názov",
      url_placeholder: "Upraviť URL",
    },
  },
  comments: {
    edited: "upravený",
    save_button_text: "Uložiť",
    cancel_button_text: "Zrušiť",
    actions: {
      add_reaction: "Pridať reakciu",
      resolve: "Vyriešiť",
      edit_comment: "Upraviť komentár",
      delete_comment: "Vymazať komentár",
      more_actions: "Ďalšie akcie",
    },
    reactions: {
      reacted_by: "Reagoval/a",
    },
    sidebar: {
      marked_as_resolved: "Označené ako vyriešené",
      more_replies: (count: number) => `${count} ďalších odpovedí`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
