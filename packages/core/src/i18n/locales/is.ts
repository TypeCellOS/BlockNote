import type { Dictionary } from "../dictionary.js";

export const is: Dictionary = {
  slash_menu: {
    heading: {
      title: "Fyrirsögn 1",
      subtext: "Notað fyrir efstu fyrirsögn",
      aliases: ["h", "fyrirsogn1", "h1"],
      group: "Fyrirsagnir",
    },
    heading_2: {
      title: "Fyrirsögn 2",
      subtext: "Notað fyrir lykilhluta",
      aliases: ["h2", "fyrirsogn2", "undirfyrirsogn"],
      group: "Fyrirsagnir",
    },
    heading_3: {
      title: "Fyrirsögn 3",
      subtext: "Notað fyrir undirhluta og hópfyrirsagnir",
      aliases: ["h3", "fyrirsogn3", "undirfyrirsogn"],
      group: "Fyrirsagnir",
    },
    heading_4: {
      title: "Fyrirsögn 4",
      subtext: "Titill fyrir minni undirhluta",
      aliases: ["h4", "fyrirsogn4", "undirfyrirsogn4"],
      group: "Undirfyrirsagnir",
    },
    heading_5: {
      title: "Fyrirsögn 5",
      subtext: "Titill fyrir litla undirkafla",
      aliases: ["h5", "fyrirsogn5", "undirfyrirsogn5"],
      group: "Undirfyrirsagnir",
    },
    heading_6: {
      title: "Fyrirsögn 6",
      subtext: "Titill á lægsta stigi",
      aliases: ["h6", "fyrirsogn6", "undirfyrirsogn6"],
      group: "Undirfyrirsagnir",
    },
    toggle_heading: {
      title: "Fellanleg Fyrirsögn 1",
      subtext:
        "Fellanleg efsta fyrirsögn sem hægt er að sýna eða fela innihald",
      aliases: ["h", "fyrirsogn1", "h1", "fellanleg", "fellanlegt"],
      group: "Undirfyrirsagnir",
    },
    toggle_heading_2: {
      title: "Fellanleg Fyrirsögn 2",
      subtext:
        "Fellanleg fyrirsögn fyrir lykilhluta sem hægt er að sýna eða fela innihald",
      aliases: [
        "h2",
        "fyrirsogn2",
        "undirfyrirsogn",
        "fellanleg",
        "fellanlegt",
      ],
      group: "Undirfyrirsagnir",
    },
    toggle_heading_3: {
      title: "Fellanleg Fyrirsögn 3",
      subtext:
        "Fellanleg fyrirsögn fyrir undirhluta og hópfyrirsagnir sem hægt er að sýna eða fela innihald",
      aliases: [
        "h3",
        "fyrirsogn3",
        "undirfyrirsogn",
        "fellanleg",
        "fellanlegt",
      ],
      group: "Undirfyrirsagnir",
    },
    quote: {
      title: "Tilvitnun",
      subtext: "Tilvitnun eða útdráttur",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Grunnblokkar",
    },
    numbered_list: {
      title: "Númeruð listi",
      subtext: "Notað til að birta númeraðan lista",
      aliases: ["ol", "li", "listi", "numeradurlisti"],
      group: "Grunnblokkar",
    },
    bullet_list: {
      title: "Punktalisti",
      subtext: "Notað til að birta óraðaðan lista",
      aliases: ["ul", "li", "listi", "punktalisti"],
      group: "Grunnblokkar",
    },
    check_list: {
      title: "Athugunarlisti",
      subtext: "Notað til að sýna lista með gátreitum",
      aliases: ["ul", "li", "listi", "athugunarlisti", "merktur listi"],
      group: "Grunnblokkar",
    },
    toggle_list: {
      title: "Fellanlegur listi",
      subtext: "Listi með földum undirliðum",
      aliases: [
        "li",
        "listi",
        "fellanlegur listi",
        "samfellanlegur listi",
        "faldanlegur listi",
      ],
      group: "Grunnblokkar",
    },
    paragraph: {
      title: "Málsgrein",
      subtext: "Notað fyrir meginmál skjalsins",
      aliases: ["p", "malsgrein"],
      group: "Grunnblokkar",
    },
    code_block: {
      title: "Kóðablokk",
      subtext: "Kóðablokkur með litskiptingu",
      aliases: ["kóði", "pre"],
      group: "Grunnblokkar",
    },
    page_break: {
      title: "Síðubrot",
      subtext: "Síðuskil",
      aliases: ["page", "break", "separator", "síðubrot", "síðuskil"],
      group: "Grunnblokkir",
    },
    table: {
      title: "Tafla",
      subtext: "Notað fyrir töflur",
      aliases: ["tafla"],
      group: "Ítarlegt",
    },
    image: {
      title: "Mynd",
      subtext: "Settu inn mynd",
      aliases: [
        "mynd",
        "myndaupphlaed",
        "upphlaed",
        "img",
        "mynd",
        "media",
        "url",
      ],
      group: "Miðlar",
    },
    video: {
      title: "Myndband",
      subtext: "Setja inn myndband",
      aliases: [
        "myndband",
        "videoUpphala",
        "hlaða upp",
        "mp4",
        "kvikmynd",
        "miðill",
        "url",
      ],
      group: "Miðill",
    },
    audio: {
      title: "Hljóð",
      subtext: "Setja inn hljóð",
      aliases: [
        "hljóð",
        "audioUpphala",
        "hlaða upp",
        "mp3",
        "hljóð",
        "miðill",
        "url",
      ],
      group: "Miðlar",
    },
    file: {
      title: "Skrá",
      subtext: "Setja inn skrá",
      aliases: ["skrá", "hlaða upp", "fella inn", "miðill", "url"],
      group: "Miðlar",
    },
    emoji: {
      title: "Emoji",
      subtext: "Notað til að setja inn smámynd",
      aliases: ["emoji", "andlitsávísun", "tilfinningar", "andlit"],
      group: "Annað",
    },
    divider: {
      title: "Razdjelnik",
      subtext: "Razdjelnik blokova",
      aliases: ["razdjelnik", "hr", "horizontal rule"],
      group: "Osnovni blokovi",
    },
  },
  placeholders: {
    default: "Sláðu inn texta eða skrifaðu '/' fyrir skipanir",
    heading: "Fyrirsögn",
    toggleListItem: "Víxla",
    bulletListItem: "Listi",
    numberedListItem: "Listi",
    checkListItem: "Listi",
    new_comment: "Skrifaðu athugasemd...",
    edit_comment: "Breyta athugasemd...",
    comment_reply: "Bæta við athugasemd...",
  },
  file_blocks: {
    add_button_text: {
      image: "Bæta við mynd",
      video: "Bæta við myndbandi",
      audio: "Bæta við hljóði",
      file: "Bæta við skrá",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "Tóm fellilína. Smelltu til að bæta við blokk.",
  },
  side_menu: {
    add_block_label: "Bæta við blokki",
    drag_handle_label: "Opna blokkarvalmynd",
  },
  drag_handle: {
    delete_menuitem: "Eyða",
    colors_menuitem: "Litir",
    header_row_menuitem: "Höfuðröð",
    header_column_menuitem: "Höfuðdálkur",
  },
  table_handle: {
    delete_column_menuitem: "Eyða dálki",
    delete_row_menuitem: "Eyða röð",
    add_left_menuitem: "Bæta dálki við til vinstri",
    add_right_menuitem: "Bæta dálki við til hægri",
    add_above_menuitem: "Bæta röð við fyrir ofan",
    add_below_menuitem: "Bæta röð við fyrir neðan",
    split_cell_menuitem: "Splita dálk",
    merge_cells_menuitem: "Sameina dálka",
    background_color_menuitem: "Breyta bakgrunni",
  },
  suggestion_menu: {
    no_items_title: "Engir hlutir fundust",
  },
  color_picker: {
    text_title: "Texti",
    background_title: "Bakgrunnur",
    colors: {
      default: "Sjálfgefið",
      gray: "Grár",
      brown: "Brúnn",
      red: "Rauður",
      orange: "Appelsínugulur",
      yellow: "Gulur",
      green: "Grænn",
      blue: "Blár",
      purple: "Fjólublár",
      pink: "Bleikur",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Feitletrað",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Skáletrað",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Undirstrikað",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Yfirstrikað",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Kóði",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Litir",
    },
    link: {
      tooltip: "Búa til tengil",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Breyta myndatexta",
      input_placeholder: "Breyta myndatexta",
    },
    file_replace: {
      tooltip: {
        image: "Skipta um mynd",
        video: "Skipta um myndband",
        audio: "Skipta um hljóð",
        file: "Skipta um skrá",
      },
    },
    file_rename: {
      tooltip: {
        image: "Endurnefna mynd",
        video: "Endurnefna myndband",
        audio: "Endurnefna hljóð",
        file: "Endurnefna skrá",
      },
      input_placeholder: {
        image: "Endurnefna mynd",
        video: "Endurnefna myndband",
        audio: "Endurnefna hljóð",
        file: "Endurnefna skrá",
      },
    },
    file_download: {
      tooltip: {
        image: "Sækja mynd",
        video: "Sækja myndband",
        audio: "Sækja hljóð",
        file: "Sækja skrá",
      },
    },
    file_delete: {
      tooltip: {
        image: "Eyða mynd",
        video: "Eyða myndbandi",
        audio: "Eyða hljóði",
        file: "Eyða skrá",
      },
    },
    file_preview_toggle: {
      tooltip: "Skipta um forskoðun",
    },
    nest: {
      tooltip: "Fella blokk saman",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Afþýða blokk",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Vinstrijafna texta",
    },
    align_center: {
      tooltip: "Miðjustilla texta",
    },
    align_right: {
      tooltip: "Hægrijafna texta",
    },
    align_justify: {
      tooltip: "Jafna texta",
    },
    table_cell_merge: {
      tooltip: "Sameina dálka",
    },
    comment: {
      tooltip: "Bæta við athugasemd",
    },
  },
  file_panel: {
    upload: {
      title: "Hlaða upp",
      file_placeholder: {
        image: "Hlaða upp mynd",
        video: "Hlaða upp myndband",
        audio: "Hlaða upp hljóð",
        file: "Hlaða upp skrá",
      },
      upload_error: "Villa: Upphleðsla mistókst",
    },
    embed: {
      title: "Innsetja",
      embed_button: {
        image: "Innsetja mynd",
        video: "Innsetja myndband",
        audio: "Innsetja hljóð",
        file: "Innsetja skrá",
      },
      url_placeholder: "Sláðu inn URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Fjarlægja tengil",
    },
    edit: {
      text: "Breyta tengli",
      tooltip: "Breyta",
    },
    open: {
      tooltip: "Opna í nýjum flipa",
    },
    form: {
      title_placeholder: "Breyta titli",
      url_placeholder: "Breyta URL",
    },
  },
  comments: {
    edited: "breytt",
    save_button_text: "Vista",
    cancel_button_text: "Hætta",
    actions: {
      add_reaction: "Bæta við viðbrögðum",
      resolve: "Leysa",
      edit_comment: "Breyta athugasemd",
      delete_comment: "Eyða athugasemd",
      more_actions: "Fleiri aðgerðir",
    },
    reactions: {
      reacted_by: "Brást við af",
    },
    sidebar: {
      marked_as_resolved: "Merkt sem leyst",
      more_replies: (count) => `${count} fleiri svör`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
