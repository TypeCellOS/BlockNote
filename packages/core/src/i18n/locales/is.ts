import type { Dictionary } from "../dictionary";

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
    paragraph: {
      title: "Málsgrein",
      subtext: "Notað fyrir meginmál skjalsins",
      aliases: ["p", "malsgrein"],
      group: "Grunnblokkar",
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
        "drive",
        "dropbox",
      ],
      group: "Miðlar",
    },
  },
  placeholders: {
    default: "Sláðu inn texta eða skrifaðu '/' fyrir skipanir",
    heading: "Fyrirsögn",
    bulletListItem: "Listi",
    numberedListItem: "Listi",
  },
  image: {
    add_button: "Bæta við mynd",
  },
  side_menu: {
    add_block_label: "Bæta við blokki",
    drag_handle_label: "Opna blokkarvalmynd",
  },
  drag_handle: {
    delete_menuitem: "Eyða",
    colors_menuitem: "Litir",
  },
  table_handle: {
    delete_column_menuitem: "Eyða dálki",
    delete_row_menuitem: "Eyða röð",
    add_left_menuitem: "Bæta dálki við til vinstri",
    add_right_menuitem: "Bæta dálki við til hægri",
    add_above_menuitem: "Bæta röð við fyrir ofan",
    add_below_menuitem: "Bæta röð við fyrir neðan",
  },
  suggestion_menu: {
    no_items_title: "Engir hlutir fundust",
    loading: "Hleður…",
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
    image_caption: {
      tooltip: "Breyta myndatexta",
      input_placeholder: "Breyta myndatexta",
    },
    image_replace: {
      tooltip: "Skipta um mynd",
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
  },
  image_panel: {
    upload: {
      title: "Hlaða upp",
      file_placeholder: "Hlaða upp mynd",
      upload_error: "Villa: Upphleðsla mistókst",
    },
    embed: {
      title: "Innsetja",
      embed_button: "Innsetja mynd",
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
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
