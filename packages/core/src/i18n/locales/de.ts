import { Dictionary } from "../dictionary.js";

export const de: Dictionary = {
  slash_menu: {
    heading: {
      title: "Überschrift 1",
      subtext: "Hauptebene Überschrift",
      aliases: ["h", "überschrift1", "h1"],
      group: "Überschriften",
    },
    heading_2: {
      title: "Überschrift 2",
      subtext: "Wichtige Abschnittsüberschrift",
      aliases: ["h2", "überschrift2", "unterüberschrift"],
      group: "Überschriften",
    },
    heading_3: {
      title: "Überschrift 3",
      subtext: "Unterabschnitts- und Gruppenüberschrift",
      aliases: ["h3", "überschrift3", "unterüberschrift"],
      group: "Überschriften",
    },
    heading_4: {
      title: "Überschrift 4",
      subtext: "Überschrift für kleinere Unterabschnitte",
      aliases: ["h4", "überschrift4", "unterüberschrift4"],
      group: "Unterüberschriften",
    },
    heading_5: {
      title: "Überschrift 5",
      subtext: "Überschrift für tiefere Unterabschnitte",
      aliases: ["h5", "überschrift5", "unterüberschrift5"],
      group: "Unterüberschriften",
    },
    heading_6: {
      title: "Überschrift 6",
      subtext: "Überschrift auf der untersten Ebene",
      aliases: ["h6", "überschrift6", "unterüberschrift6"],
      group: "Unterüberschriften",
    },
    toggle_heading: {
      title: "Aufklappbare Überschrift 1",
      subtext: "Aufklappbare Hauptebene Überschrift",
      aliases: ["h", "überschrift1", "h1", "aufklappbar", "einklappbar"],
      group: "Unterüberschrift",
    },
    toggle_heading_2: {
      title: "Aufklappbare Überschrift 2",
      subtext: "Aufklappbare wichtige Abschnittsüberschrift",
      aliases: [
        "h2",
        "überschrift2",
        "unterüberschrift",
        "aufklappbar",
        "einklappbar",
      ],
      group: "Unterüberschriften",
    },
    toggle_heading_3: {
      title: "Aufklappbare Überschrift 3",
      subtext: "Aufklappbare Unterabschnitts- und Gruppenüberschrift",
      aliases: [
        "h3",
        "überschrift3",
        "unterüberschrift",
        "aufklappbar",
        "einklappbar",
      ],
      group: "Unterüberschriften",
    },
    quote: {
      title: "Zitat",
      subtext: "Zitat oder Auszug",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Grundlegende Blöcke",
    },
    numbered_list: {
      title: "Nummerierte Liste",
      subtext: "Liste mit nummerierten Elementen",
      aliases: ["ol", "li", "liste", "nummerierteliste", "nummerierte liste"],
      group: "Grundlegende Blöcke",
    },
    bullet_list: {
      title: "Aufzählungsliste",
      subtext: "Liste mit unnummerierten Elementen",
      aliases: ["ul", "li", "liste", "aufzählungsliste", "aufzählung liste"],
      group: "Grundlegende Blöcke",
    },
    check_list: {
      title: "Checkliste",
      subtext: "Liste mit Kontrollkästchen",
      aliases: [
        "ul",
        "li",
        "liste",
        "checkliste",
        "check liste",
        "geprüfte liste",
        "kontrollkästchen",
      ],
      group: "Grundlegende Blöcke",
    },
    toggle_list: {
      title: "Aufklappbare Liste",
      subtext: "Liste mit ausblendbare Unterpunkten",
      aliases: [
        "li",
        "liste",
        "aufklappbare liste",
        "einklappbare liste",
        "aufklappbareListe",
        "aufklappbare liste",
      ],
      group: "Grundlegende Blöcke",
    },
    paragraph: {
      title: "Absatz",
      subtext: "Der Hauptteil Ihres Dokuments",
      aliases: ["p", "absatz"],
      group: "Grundlegende Blöcke",
    },
    code_block: {
      title: "Codeblock",
      subtext: "Codeblock mit Syntaxhervorhebung",
      aliases: ["code", "pre"],
      group: "Grundlegende Blöcke",
    },
    page_break: {
      title: "Seitenumbruch",
      subtext: "Seitentrenner",
      aliases: ["page", "break", "separator", "seitenumbruch", "trenner"],
      group: "Grundlegende Blöcke",
    },
    table: {
      title: "Tabelle",
      subtext: "Tabelle mit editierbaren Zellen",
      aliases: ["tabelle"],
      group: "Erweitert",
    },
    image: {
      title: "Bild",
      subtext: "Größenveränderbares Bild mit Beschriftung",
      aliases: [
        "bild",
        "bildhochladen",
        "hochladen",
        "img",
        "bild",
        "medien",
        "url",
      ],
      group: "Medien",
    },
    video: {
      title: "Video",
      subtext: "Größenveränderbares Video mit Beschriftung",
      aliases: [
        "video",
        "videoupload",
        "hochladen",
        "mp4",
        "film",
        "medien",
        "url",
      ],
      group: "Medien",
    },
    audio: {
      title: "Audio",
      subtext: "Eingebettetes Audio mit Beschriftung",
      aliases: [
        "audio",
        "audioupload",
        "hochladen",
        "mp3",
        "ton",
        "medien",
        "url",
      ],
      group: "Medien",
    },
    file: {
      title: "Datei",
      subtext: "Eingebettete Datei",
      aliases: ["datei", "hochladen", "einbetten", "medien", "url"],
      group: "Medien",
    },
    emoji: {
      title: "Emoji",
      subtext: "Nach Emoji suchen und einfügen",
      aliases: ["emoji", "emote", "emotion", "gesicht"],
      group: "Andere",
    },
  },
  placeholders: {
    default: "Text eingeben oder '/' für Befehle tippen",
    heading: "Überschrift",
    toggleListItem: "Umschalten",
    bulletListItem: "Liste",
    numberedListItem: "Liste",
    checkListItem: "Liste",
    new_comment: "Einen Kommentar schreiben …",
    edit_comment: "Kommentar bearbeiten …",
    comment_reply: "Kommentar hinzufügen …",
  },
  file_blocks: {
    image: {
      add_button_text: "Bild hinzufügen",
    },
    video: {
      add_button_text: "Video hinzufügen",
    },
    audio: {
      add_button_text: "Audio hinzufügen",
    },
    file: {
      add_button_text: "Datei hinzufügen",
    },
  },
  side_menu: {
    add_block_label: "Block hinzufügen",
    drag_handle_label: "Blockmenü öffnen",
  },
  drag_handle: {
    delete_menuitem: "Löschen",
    colors_menuitem: "Farben",
    header_row_menuitem: "Kopfzeile",
    header_column_menuitem: "Kopfspalte",
  },
  table_handle: {
    delete_column_menuitem: "Spalte löschen",
    delete_row_menuitem: "Zeile löschen",
    add_left_menuitem: "Spalte links hinzufügen",
    add_right_menuitem: "Spalte rechts hinzufügen",
    add_above_menuitem: "Zeile oberhalb hinzufügen",
    add_below_menuitem: "Zeile unterhalb hinzufügen",
    split_cell_menuitem: "Zelle teilen",
    merge_cells_menuitem: "Zellen zusammenführen",
    background_color_menuitem: "Hintergrundfarbe",
  },
  suggestion_menu: {
    no_items_title: "Keine Elemente gefunden",
  },
  color_picker: {
    text_title: "Text",
    background_title: "Hintergrund",
    colors: {
      default: "Standard",
      gray: "Grau",
      brown: "Braun",
      red: "Rot",
      orange: "Orange",
      yellow: "Gelb",
      green: "Grün",
      blue: "Blau",
      purple: "Lila",
      pink: "Rosa",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "Fett",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Kursiv",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Unterstrichen",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Durchgestrichen",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Code",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Farben",
    },
    link: {
      tooltip: "Link erstellen",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Beschriftung bearbeiten",
      input_placeholder: "Beschriftung bearbeiten",
    },
    file_replace: {
      tooltip: {
        image: "Bild ersetzen",
        video: "Video ersetzen",
        audio: "Audio ersetzen",
        file: "Datei ersetzen",
      },
    },
    file_rename: {
      tooltip: {
        image: "Bild umbenennen",
        video: "Video umbenennen",
        audio: "Audio umbenennen",
        file: "Datei umbenennen",
      },
      input_placeholder: {
        image: "Bild umbenennen",
        video: "Video umbenennen",
        audio: "Audio umbenennen",
        file: "Datei umbenennen",
      },
    },
    file_download: {
      tooltip: {
        image: "Bild herunterladen",
        video: "Video herunterladen",
        audio: "Audio herunterladen",
        file: "Datei herunterladen",
      },
    },
    file_delete: {
      tooltip: {
        image: "Bild löschen",
        video: "Video löschen",
        audio: "Audio löschen",
        file: "Datei löschen",
      },
    },
    file_preview_toggle: {
      tooltip: "Vorschau umschalten",
    },
    nest: {
      tooltip: "Block verschachteln",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Block entnesten",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Text linksbündig",
    },
    align_center: {
      tooltip: "Text zentrieren",
    },
    align_right: {
      tooltip: "Text rechtsbündig",
    },
    align_justify: {
      tooltip: "Text Blocksatz",
    },
    table_cell_merge: {
      tooltip: "Zellen zusammenführen",
    },
    comment: {
      tooltip: "Kommentar hinzufügen",
    },
  },
  file_panel: {
    upload: {
      title: "Hochladen",
      file_placeholder: {
        image: "Bild hochladen",
        video: "Video hochladen",
        audio: "Audio hochladen",
        file: "Datei hochladen",
      },
      upload_error: "Fehler: Hochladen fehlgeschlagen",
    },
    embed: {
      title: "Einbetten",
      embed_button: {
        image: "Bild einbetten",
        video: "Video einbetten",
        audio: "Audio einbetten",
        file: "Datei einbetten",
      },
      url_placeholder: "URL eingeben",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Link entfernen",
    },
    edit: {
      text: "Link bearbeiten",
      tooltip: "Bearbeiten",
    },
    open: {
      tooltip: "In neuem Tab öffnen",
    },
    form: {
      title_placeholder: "Titel bearbeiten",
      url_placeholder: "URL bearbeiten",
    },
  },
  comments: {
    edited: "bearbeitet",
    save_button_text: "Speichern",
    cancel_button_text: "Abbrechen",
    actions: {
      add_reaction: "Reaktion hinzufügen",
      resolve: "Lösen",
      edit_comment: "Kommentar bearbeiten",
      delete_comment: "Kommentar löschen",
      more_actions: "Weitere Aktionen",
    },
    reactions: {
      reacted_by: "Reagiert von",
    },
    sidebar: {
      marked_as_resolved: "Als gelöst markiert",
      more_replies: (count) => `${count} weitere Antworten`,
    },
  },
  generic: {
    ctrl_shortcut: "Strg",
  },
};
