import type { Dictionary } from "../dictionary";

export const pl: Dictionary = {
  slash_menu: {
    heading: {
      title: "Nagłówek 1",
      subtext: "Używany dla nagłówka najwyższego poziomu",
      aliases: ["h", "naglowek1", "h1"],
      group: "Nagłówki",
    },
    heading_2: {
      title: "Nagłówek 2",
      subtext: "Używany dla kluczowych sekcji",
      aliases: ["h2", "naglowek2", "podnaglowek"],
      group: "Nagłówki",
    },
    heading_3: {
      title: "Nagłówek 3",
      subtext: "Używany dla podsekcji i grup nagłówków",
      aliases: ["h3", "naglowek3", "podnaglowek"],
      group: "Nagłówki",
    },
    numbered_list: {
      title: "Lista numerowana",
      subtext: "Używana do wyświetlania listy numerowanej",
      aliases: ["ol", "li", "lista", "numerowana lista"],
      group: "Podstawowe bloki",
    },
    bullet_list: {
      title: "Lista punktowana",
      subtext: "Używana do wyświetlania listy bez numeracji",
      aliases: ["ul", "li", "lista", "punktowana lista"],
      group: "Podstawowe bloki",
    },
    check_list: {
      title: "Lista z polami wyboru",
      subtext: "Używana do wyświetlania listy z polami wyboru",
      aliases: ["ul", "li", "lista", "lista z polami wyboru", "pole wyboru"],
      group: "Podstawowe bloki",
    },
    paragraph: {
      title: "Akapit",
      subtext: "Używany dla treści dokumentu",
      aliases: ["p", "akapit"],
      group: "Podstawowe bloki",
    },
    table: {
      title: "Tabela",
      subtext: "Używana do tworzenia tabel",
      aliases: ["tabela"],
      group: "Zaawansowane",
    },
    image: {
      title: "Zdjęcie",
      subtext: "Wstaw zdjęcie",
      aliases: [
        "obraz",
        "wrzućZdjęcie",
        "wrzuć",
        "img",
        "zdjęcie",
        "media",
        "url",
      ],
      group: "Media",
    },
    video: {
      title: "Wideo",
      subtext: "Wstaw wideo",
      aliases: ["wideo", "wrzućWideo", "wrzuć", "mp4", "film", "media", "url"],
      group: "Media",
    },
    audio: {
      title: "Audio",
      subtext: "Wstaw audio",
      aliases: [
        "audio",
        "wrzućAudio",
        "wrzuć",
        "mp3",
        "dźwięk",
        "media",
        "url",
      ],
      group: "Media",
    },
    file: {
      title: "Plik",
      subtext: "Wstaw plik",
      aliases: ["plik", "wrzuć", "wstaw", "media", "url"],
      group: "Media",
    },
    emoji: {
      title: "Emoji",
      subtext: "Używane do wstawiania emoji",
      aliases: ["emoji", "emotka", "wyrażenie emocji", "twarz"],
      group: "Inne",
    },
  },
  placeholders: {
    default: "Wprowadź tekst lub wpisz '/' aby użyć poleceń",
    heading: "Nagłówek",
    bulletListItem: "Lista",
    numberedListItem: "Lista",
    checkListItem: "Lista",
  },
  file_blocks: {
    image: {
      add_button_text: "Dodaj zdjęcie",
    },
    video: {
      add_button_text: "Dodaj wideo",
    },
    audio: {
      add_button_text: "Dodaj audio",
    },
    file: {
      add_button_text: "Dodaj plik",
    },
  },
  side_menu: {
    add_block_label: "Dodaj blok",
    drag_handle_label: "Otwórz menu bloków",
  },
  drag_handle: {
    delete_menuitem: "Usuń",
    colors_menuitem: "Kolory",
  },
  table_handle: {
    delete_column_menuitem: "Usuń kolumnę",
    delete_row_menuitem: "Usuń wiersz",
    add_left_menuitem: "Dodaj kolumnę po lewej",
    add_right_menuitem: "Dodaj kolumnę po prawej",
    add_above_menuitem: "Dodaj wiersz powyżej",
    add_below_menuitem: "Dodaj wiersz poniżej",
  },
  suggestion_menu: {
    no_items_title: "Nie znaleziono elementów",
    loading: "Ładowanie…",
  },
  color_picker: {
    text_title: "Tekst",
    background_title: "Tło",
    colors: {
      default: "Domyślny",
      gray: "Szary",
      brown: "Brązowy",
      red: "Czerwony",
      orange: "Pomarańczowy",
      yellow: "Żółty",
      green: "Zielony",
      blue: "Niebieski",
      purple: "Fioletowy",
      pink: "Różowy",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Pogrubienie",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Kursywa",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Podkreślenie",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Przekreślenie",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Kod",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Kolory",
    },
    link: {
      tooltip: "Utwórz link",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Zmień podpis",
      input_placeholder: "Zmień podpis",
    },
    file_replace: {
      tooltip: {
        image: "Zmień obraz",
        video: "Zmień wideo",
        audio: "Zmień audio",
        file: "Zmień plik",
      },
    },
    file_rename: {
      tooltip: {
        image: "Zmień nazwę zdjęcia",
        video: "Zmień nazwę wideo",
        audio: "Zmień nazwę audio",
        file: "Zmień nazwę pliku",
      },
      input_placeholder: {
        image: "Zmień nazwę zdjęcia",
        video: "Zmień nazwę wideo",
        audio: "Zmień nazwę audio",
        file: "Zmień nazwę pliku",
      },
    },
    file_download: {
      tooltip: {
        image: "Pobierz zdjęcie",
        video: "Pobierz wideo",
        audio: "Pobierz audio",
        file: "Pobierz plik",
      },
    },
    file_delete: {
      tooltip: {
        image: "Usuń zdjęcie",
        video: "Usuń wideo",
        audio: "Usuń audio",
        file: "Usuń plik",
      },
    },
    file_preview_toggle: {
      tooltip: "Przełącz podgląd",
    },
    nest: {
      tooltip: "Zagnieźdź blok",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Odgagnieźdź blok",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Wyrównaj tekst do lewej",
    },
    align_center: {
      tooltip: "Wyśrodkuj tekst",
    },
    align_right: {
      tooltip: "Wyrównaj tekst do prawej",
    },
    align_justify: {
      tooltip: "Wyjustuj tekst",
    },
  },
  file_panel: {
    upload: {
      title: "Wrzuć",
      file_placeholder: {
        image: "Wrzuć zdjęcie",
        video: "Wrzuć wideo",
        audio: "Wrzuć audio",
        file: "Wrzuć plik",
      },
      upload_error: "Błąd: Przesyłanie nie powiodło się",
    },
    embed: {
      title: "Wstaw",
      embed_button: {
        image: "Wstaw zdjęice",
        video: "Wstaw wideo",
        audio: "Wstaw audio",
        file: "Wstaw plik",
      },
      url_placeholder: "Wprowadź URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Usuń link",
    },
    edit: {
      text: "Edytuj link",
      tooltip: "Edytuj",
    },
    open: {
      tooltip: "Otwórz w nowej karcie",
    },
    form: {
      title_placeholder: "Edytuj tytuł",
      url_placeholder: "Edytuj URL",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
