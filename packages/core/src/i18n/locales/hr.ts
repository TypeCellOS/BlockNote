export const hr = {
  slash_menu: {
    heading: {
      title: "Naslov 1",
      subtext: "Glavni naslov",
      aliases: ["h", "naslov1", "h1"],
      group: "Naslovi",
    },
    heading_2: {
      title: "Naslov 2",
      subtext: "Naslov poglavlja",
      aliases: ["h2", "naslov2", "podnaslov"],
      group: "Naslovi",
    },
    heading_3: {
      title: "Naslov 3",
      subtext: "Naslov podpoglavlja",
      aliases: ["h3", "naslov3", "podnaslov"],
      group: "Naslovi",
    },
    numbered_list: {
      title: "Numerirani popis",
      subtext: "Popis s numeriranim stavkama",
      aliases: ["poredaniPopis", "stavkaPopisa", "popis", "numeriraniPopis", "numerirani popis"],
      group: "Osnovni blokovi",
    },
    bullet_list: {
      title: "Popis s oznakama",
      subtext: "Popis s grafičkim oznakama",
      aliases: ["neporedaniPopis", "stavkaPopisa", "popis", "popisSOznakama", "popis s oznakama"],
      group: "Osnovni blokovi",
    },
    check_list: {
      title: "Check lista",
      subtext: "Popis s kućicama za označavanje",
      aliases: [
          "neporedaniPopis",
          "stavkaPopisa",
          "popis",
          "popisZaProvjeru",
          "check lista",
          "označeni popis",
          "kućicaZaOznačavanje",
      ],
      group: "Osnovni blokovi",
    },
    paragraph: {
      title: "Normalan tekst",
      subtext: "Tekst paragrafa",
      aliases: ["p", "paragraf"],
      group: "Osnovni blokovi",
    },
    table: {
      title: "Tablica",
      subtext: "Tablica s podesivim ćelijama",
      aliases: ["tablica"],
      group: "Napredno",
    },
    image: {
      title: "Slika",
      subtext: "Slika s podesivom veličinom i natpisom",
      aliases: [
          "slika",
          "učitavanjeSlike",
          "učitaj",
          "img",
          "fotografija",
          "medij",
          "url",
      ],
      group: "Mediji",
    },
    video: {
      title: "Video",
      subtext: "Video s podesivom veličinom i natpisom",
      aliases: [
          "video",
          "učitavanjeVidea",
          "učitaj",
          "mp4",
          "film",
          "medij",
          "url",
      ],
      group: "Mediji",
    },
    audio: {
      title: "Audio",
      subtext: "Audio s natpisom",
      aliases: [
          "audio",
          "učitavanjeAudija",
          "učitaj",
          "mp3",
          "zvuk",
          "medij",
          "url",
      ],
      group: "Mediji",
    },
    file: {
      title: "Datoteka",
      subtext: "Ugrađena datoteka",
      aliases: ["datoteka", "učitaj", "ugradi", "medij", "url"],
      group: "Mediji",
    },
    emoji: {
      title: "Emoji",
      subtext: "Pretraži i umetni emoji",
      aliases: ["emoji", "emotikon", "emocija", "lice"],
      group: "Ostalo",
    },
  },
  placeholders: {
    default: "Unesi tekst ili upiši ‘/’ za naredbe",
    heading: "Naslov",
    bulletListItem: "Lista",
    numberedListItem: "Lista",
    checkListItem: "Lista",
  },
  file_blocks: {
    image: {
      add_button_text: "Dodaj sliku",
    },
    video: {
      add_button_text: "Dodaj video",
    },
    audio: {
      add_button_text: "Dodaj audio",
    },
    file: {
      add_button_text: "Dodaj datoteku",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "Dodaj blok",
    drag_handle_label: "Meni za dodavanje bloka",
  },
  drag_handle: {
    delete_menuitem: "Ukloni",
    colors_menuitem: "Boje",
  },
  table_handle: {
    delete_column_menuitem: "Ukloni stupac",
    delete_row_menuitem: "Ukloni redak",
    add_left_menuitem: "Dodaj stupac lijevo",
    add_right_menuitem: "Dodaj stupac desno",
    add_above_menuitem: "Dodaj redak iznad",
    add_below_menuitem: "Dodaj redak ispod",
  },
  suggestion_menu: {
    no_items_title: "Stavke nisu pronađene",
    loading: "Učitavanje…",
  },
  color_picker: {
    text_title: "Tekst",
    background_title: "Pozadina",
    colors: {
        default: "Zadano",
        gray: "Siva",
        brown: "Smeđa",
        red: "Crvena",
        orange: "Narančasta",
        yellow: "Žuta",
        green: "Zelena",
        blue: "Plava",
        purple: "Ljubičasta",
        pink: "Ružičasta",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Podebljano",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Kurziv",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Podcrtano",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Precrtano",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Kod",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Boja",
    },
    link: {
      tooltip: "Kreiraj poveznicu",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Uredi natpis",
      input_placeholder: "Uredi natpis",
    },
    file_replace: {
      tooltip: {
        image: "Zamijeni sliku",
        video: "Zamijeni video",
        audio: "Zamijeni audio",
        file: "Zamijeni datoteku",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "Preimenuj sliku",
        video: "Preimenuj video",
        audio: "Preimenuj audio",
        file: "Preimenuj datoteku",
      } as Record<string, string>,
      input_placeholder: {
        image: "Preimenuj sliku",
        video: "Preimenuj video",
        audio: "Preimenuj audio",
        file: "Preimenuj datoteku",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "Preuzmi sliku",
        video: "Preuzmi video",
        audio: "Preuzmi audio",
        file: "Preuzmi datoteku",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "Ukloni sliku",
        video: "Ukloni video",
        audio: "Ukloni audio",
        file: "Ukloni datoteku",
      } as Record<string, string>,
    },
  file_preview_toggle: {
      tooltip: "Prikaži/sakrij pregled",
  },
  nest: {
      tooltip: "Ugnijezdi blok",
      secondary_tooltip: "Tab",
  },
  unnest: {
      tooltip: "Razgnijezdi blok",
      secondary_tooltip: "Shift+Tab",
  },
  align_left: {
      tooltip: "Poravnaj tekst lijevo",
  },
  align_center: {
      tooltip: "Poravnaj tekst po sredini",
  },
  align_right: {
      tooltip: "Poravnaj tekst desno",
  },
  align_justify: {
      tooltip: "Poravnaj tekst obostrano",
  },
  },
  file_panel: {
    upload: {
      title: "Učitaj",
      file_placeholder: {
        image: "Učitaj sliku",
        video: "Učitaj video",
        audio: "Učitaj audio",
        file: "Učitaj datoteku",
      } as Record<string, string>,
      upload_error: "Pogreška: Učitavanje nije uspjelo",
    },
    embed: {
      title: "Ugradi",
      embed_button: {
        image: "Ugradi sliku",
        video: "Ugradi video",
        audio: "Ugradi audio",
        file: "Ugradi datoteku",
      } as Record<string, string>,
      url_placeholder: "Dodaj URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Ukloni poveznicu",
    },
    edit: {
      text: "Uredi poveznicu",
      tooltip: "Uredi",
    },
    open: {
      tooltip: "Otvori u novoj kartici",
    },
    form: {
      title_placeholder: "Uredi naslov",
      url_placeholder: "Uredi URL",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
