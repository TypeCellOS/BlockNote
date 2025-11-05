import { Dictionary } from "../dictionary.js";

export const he: Dictionary = {
  slash_menu: {
    heading: {
      title: "כותרת 1",
      subtext: "כותרת ראשית",
      aliases: ["h", "heading1", "h1"],
      group: "כותרות",
    },
    heading_2: {
      title: "כותרת 2",
      subtext: "כותרת סעיף ראשי",
      aliases: ["h2", "heading2", "subheading"],
      group: "כותרות",
    },
    heading_3: {
      title: "כותרת 3",
      subtext: "כותרת משנה",
      aliases: ["h3", "heading3", "subheading"],
      group: "כותרות",
    },
    toggle_heading: {
      title: "כותרת מתקפלת 1",
      subtext: "כותרת ראשית מתקפלת",
      aliases: ["h", "heading1", "h1", "collapsable"],
      group: "כותרות משנה",
    },
    toggle_heading_2: {
      title: "כותרת מתקפלת 2",
      subtext: "כותרת סעיף ראשי מתקפלת",
      aliases: ["h2", "heading2", "subheading", "collapsable"],
      group: "כותרות משנה",
    },
    toggle_heading_3: {
      title: "כותרת מתקפלת 3",
      subtext: "כותרת משנה מתקפלת",
      aliases: ["h3", "heading3", "subheading", "collapsable"],
      group: "כותרות משנה",
    },
    heading_4: {
      title: "כותרת 4",
      subtext: "כותרת משנה",
      aliases: ["h4", "heading4", "subheading"],
      group: "כותרות משנה",
    },
    heading_5: {
      title: "כותרת 5",
      subtext: "כותרת משנה",
      aliases: ["h5", "heading5", "subheading"],
      group: "כותרות משנה",
    },
    heading_6: {
      title: "כותרת 6",
      subtext: "כותרת משנה",
      aliases: ["h6", "heading6", "subheading"],
      group: "כותרות משנה",
    },
    quote: {
      title: "ציטוט",
      subtext: "ציטוט או קטע",
      aliases: ["quotation", "blockquote", "bq"],
      group: "בלוקים בסיסיים",
    },
    toggle_list: {
      title: "רשימה מתקפלת",
      subtext: "רשימה עם פריטים ניתנים להסתרה",
      aliases: ["li", "list", "toggleList", "toggle list", "collapsable list"],
      group: "בלוקים בסיסיים",
    },
    numbered_list: {
      title: "רשימה ממוספרת",
      subtext: "רשימה עם פריטים מסודרים",
      aliases: ["ol", "li", "list", "numberedlist", "numbered list"],
      group: "בלוקים בסיסיים",
    },
    bullet_list: {
      title: "רשימת תבליטים",
      subtext: "רשימה עם פריטים לא מסודרים",
      aliases: ["ul", "li", "list", "bulletlist", "bullet list"],
      group: "בלוקים בסיסיים",
    },
    check_list: {
      title: "רשימת סימון",
      subtext: "רשימה עם תיבות סימון",
      aliases: [
        "ul",
        "li",
        "list",
        "checklist",
        "check list",
        "checked list",
        "checkbox",
      ],
      group: "בלוקים בסיסיים",
    },
    paragraph: {
      title: "פסקה",
      subtext: "גוף המסמך שלך",
      aliases: ["p", "paragraph"],
      group: "בלוקים בסיסיים",
    },
    code_block: {
      title: "בלוק קוד",
      subtext: "בלוק קוד עם הדגשת תחביר",
      aliases: ["code", "pre"],
      group: "בלוקים בסיסיים",
    },
    page_break: {
      title: "שבירת עמוד",
      subtext: "מפריד עמודים",
      aliases: ["page", "break", "separator"],
      group: "בלוקים בסיסיים",
    },
    table: {
      title: "טבלה",
      subtext: "טבלה עם תאים ניתנים לעריכה",
      aliases: ["table"],
      group: "מתקדם",
    },
    image: {
      title: "תמונה",
      subtext: "תמונה עם כיתוב וניתנת לשינוי גודל",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
      ],
      group: "מדיה",
    },
    video: {
      title: "וידאו",
      subtext: "וידאו עם כיתוב וניתן לשינוי גודל",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
      ],
      group: "מדיה",
    },
    audio: {
      title: "אודיו",
      subtext: "אודיו מוטבע עם כיתוב",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
      ],
      group: "מדיה",
    },
    file: {
      title: "קובץ",
      subtext: "קובץ מוטבע",
      aliases: ["file", "upload", "embed", "media", "url"],
      group: "מדיה",
    },
    emoji: {
      title: "אימוג'י",
      subtext: "חיפוש והוספת אימוג'י",
      aliases: ["emoji", "emote", "emotion", "face"],
      group: "אחר",
    },
    divider: {
      title: "מחיצה",
      subtext: "מחיצה בין בלוקים",
      aliases: ["divider", "hr", "horizontal rule"],
      group: "בלוקים בסיסיים",
    },
  },
  placeholders: {
    default: "הזן טקסט או הקלד '/' לפקודות",
    heading: "כותרת",
    toggleListItem: "החלף",
    bulletListItem: "רשימה",
    numberedListItem: "רשימה",
    checkListItem: "רשימה",
    emptyDocument: undefined,
    new_comment: "כתוב תגובה...",
    edit_comment: "ערוך תגובה...",
    comment_reply: "הוסף תגובה...",
  } as Record<string | "default" | "emptyDocument", string | undefined>,
  file_blocks: {
    add_button_text: {
      image: "הוסף תמונה",
      video: "הוסף וידאו",
      audio: "הוסף אודיו",
      file: "הוסף קובץ",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "מתג ריק. לחץ כדי להוסיף בלוק.",
  },
  side_menu: {
    add_block_label: "הוסף בלוק",
    drag_handle_label: "פתח תפריט בלוק",
  },
  drag_handle: {
    delete_menuitem: "מחק",
    colors_menuitem: "צבעים",
    header_row_menuitem: "שורת כותרת",
    header_column_menuitem: "עמודת כותרת",
  },
  table_handle: {
    delete_column_menuitem: "מחק עמודה",
    delete_row_menuitem: "מחק שורה",
    add_left_menuitem: "הוסף עמודה משמאל",
    add_right_menuitem: "הוסף עמודה מימין",
    add_above_menuitem: "הוסף שורה מעל",
    add_below_menuitem: "הוסף שורה מתחת",
    split_cell_menuitem: "פיצול תא",
    merge_cells_menuitem: "מיזוג תאים",
    background_color_menuitem: "צבע רקע",
  },
  suggestion_menu: {
    no_items_title: "לא נמצאו פריטים",
  },
  color_picker: {
    text_title: "טקסט",
    background_title: "רקע",
    colors: {
      default: "ברירת מחדל",
      gray: "אפור",
      brown: "חום",
      red: "אדום",
      orange: "כתום",
      yellow: "צהוב",
      green: "ירוק",
      blue: "כחול",
      purple: "סגול",
      pink: "ורוד",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "מודגש",
      secondary_tooltip: "Ctrl+B",
    },
    italic: {
      tooltip: "נטוי",
      secondary_tooltip: "Ctrl+I",
    },
    underline: {
      tooltip: "קו תחתון",
      secondary_tooltip: "Ctrl+U",
    },
    strike: {
      tooltip: "קו חוצה",
      secondary_tooltip: "Ctrl+Shift+S",
    },
    code: {
      tooltip: "קוד",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "צבעים",
    },
    link: {
      tooltip: "צור קישור",
      secondary_tooltip: "Ctrl+K",
    },
    file_caption: {
      tooltip: "ערוך כיתוב",
      input_placeholder: "ערוך כיתוב",
    },
    file_replace: {
      tooltip: {
        image: "החלף תמונה",
        video: "החלף וידאו",
        audio: "החלף אודיו",
        file: "החלף קובץ",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "שנה שם תמונה",
        video: "שנה שם וידאו",
        audio: "שנה שם אודיו",
        file: "שנה שם קובץ",
      } as Record<string, string>,
      input_placeholder: {
        image: "שנה שם תמונה",
        video: "שנה שם וידאו",
        audio: "שנה שם אודיו",
        file: "שנה שם קובץ",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "הורד תמונה",
        video: "הורד וידאו",
        audio: "הורד אודיו",
        file: "הורד קובץ",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "מחק תמונה",
        video: "מחק וידאו",
        audio: "מחק אודיו",
        file: "מחק קובץ",
      } as Record<string, string>,
    },
    file_preview_toggle: {
      tooltip: "החלף תצוגה מקדימה",
    },
    nest: {
      tooltip: "קינון בלוק",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "הוצא מקינון",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "ישר טקסט לשמאל",
    },
    align_center: {
      tooltip: "מרכז טקסט",
    },
    align_right: {
      tooltip: "ישר טקסט לימין",
    },
    align_justify: {
      tooltip: "ישר טקסט לשני הצדדים",
    },
    table_cell_merge: {
      tooltip: "מיזוג תאים",
    },
    comment: {
      tooltip: "הוסף תגובה",
    },
  },
  file_panel: {
    upload: {
      title: "העלאה",
      file_placeholder: {
        image: "העלה תמונה",
        video: "העלה וידאו",
        audio: "העלה אודיו",
        file: "העלה קובץ",
      } as Record<string, string>,
      upload_error: "שגיאה: ההעלאה נכשלה",
    },
    embed: {
      title: "הטמעה",
      embed_button: {
        image: "הטמע תמונה",
        video: "הטמע וידאו",
        audio: "הטמע אודיו",
        file: "הטמע קובץ",
      } as Record<string, string>,
      url_placeholder: "הזן כתובת URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "הסר קישור",
    },
    edit: {
      text: "ערוך קישור",
      tooltip: "ערוך",
    },
    open: {
      tooltip: "פתח בכרטיסייה חדשה",
    },
    form: {
      title_placeholder: "ערוך כותרת",
      url_placeholder: "ערוך כתובת URL",
    },
  },
  comments: {
    edited: "נערך",
    save_button_text: "שמור",
    cancel_button_text: "בטל",
    actions: {
      add_reaction: "הוסף תגובה",
      resolve: "סמן כפתור",
      edit_comment: "ערוך תגובה",
      delete_comment: "מחק תגובה",
      more_actions: "פעולות נוספות",
    },
    reactions: {
      reacted_by: "קיבל תגובה מ",
    },
    sidebar: {
      marked_as_resolved: "סומן כפתור",
      more_replies: (count: number) => `${count} תגובות נוספות`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
