import { Dictionary } from "../dictionary.js";

export const uz: Dictionary = {
  slash_menu: {
    heading: {
      title: "1-darajali sarlavha",
      subtext: "Eng yuqori darajadagi sarlavha uchun ishlatiladi",
      aliases: ["h", "heading1", "h1", "sarlavha1"],
      group: "Sarlavhalar",
    },
    heading_2: {
      title: "2-darajali sarlavha",
      subtext: "Asosiy bo‘limlar uchun ishlatiladi",
      aliases: ["h2", "heading2", "subheading", "sarlavha2", "kichik_sarlavha"],
      group: "Sarlavhalar",
    },
    heading_3: {
      title: "3-darajali sarlavha",
      subtext: "Bo‘limlar va guruhlar uchun ishlatiladi",
      aliases: ["h3", "heading3", "subheading", "sarlavha3", "kichik_sarlavha"],
      group: "Sarlavhalar",
    },
    heading_4: {
      title: "4-darajali sarlavha",
      subtext: "Yana kichik bo‘limlar uchun ishlatiladi",
      aliases: ["h4", "heading4", "subheading4", "sarlavha4", "kichik_sarlavha4"],
      group: "Kichik sarlavhalar",
    },
    heading_5: {
      title: "5-darajali sarlavha",
      subtext: "Kichik bo‘lim sarlavhalari uchun",
      aliases: ["h5", "heading5", "subheading5", "sarlavha5", "kichik_sarlavha5"],
      group: "Kichik sarlavhalar",
    },
    heading_6: {
      title: "6-darajali sarlavha",
      subtext: "Eng past darajadagi sarlavha",
      aliases: ["h6", "heading6", "subheading6", "sarlavha6", "kichik_sarlavha6"],
      group: "Kichik sarlavhalar",
    },
    toggle_heading: {
      title: "Yig‘iladigan 1-darajali sarlavha",
      subtext: "Yig‘ish/ochish mumkin bo‘lgan yuqori darajadagi sarlavha",
      aliases: ["h", "heading1", "h1", "sarlavha1", "yig‘iladigan"],
      group: "Kichik sarlavhalar",
    },
    toggle_heading_2: {
      title: "Yig‘iladigan 2-darajali sarlavha",
      subtext: "Yig‘ish/ochish mumkin bo‘lgan asosiy bo‘lim sarlavhasi",
      aliases: [
        "h2",
        "heading2",
        "subheading",
        "sarlavha2",
        "kichik_sarlavha",
        "yig‘iladigan",
      ],
      group: "Kichik sarlavhalar",
    },
    toggle_heading_3: {
      title: "Yig‘iladigan 3-darajali sarlavha",
      subtext: "Yig‘ish/ochish mumkin bo‘lgan bo‘lim sarlavhasi",
      aliases: [
        "h3",
        "heading3",
        "subheading",
        "sarlavha3",
        "kichik_sarlavha",
        "yig‘iladigan",
      ],
      group: "Kichik sarlavhalar",
    },
    quote: {
      title: "Iqtibos",
      subtext: "Iqtibos yoki parcha",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Asosiy bloklar",
    },
    numbered_list: {
      title: "Raqamlangan ro‘yxat",
      subtext: "Raqamlangan ro‘yxatni ko‘rsatish uchun",
      aliases: [
        "ol",
        "li",
        "list",
        "numberedlist",
        "numbered list",
        "ro‘yxat",
        "raqamlangan ro‘yxat",
      ],
      group: "Asosiy bloklar",
    },
    bullet_list: {
      title: "Belgili ro‘yxat",
      subtext: "Tartibsiz ro‘yxat uchun",
      aliases: [
        "ul",
        "li",
        "list",
        "bulletlist",
        "bullet list",
        "ro‘yxat",
        "belgili ro‘yxat",
      ],
      group: "Asosiy bloklar",
    },
    check_list: {
      title: "Belgilash ro‘yxati",
      subtext: "Belgilar bilan ro‘yxat",
      aliases: [
        "ul",
        "li",
        "list",
        "checklist",
        "check list",
        "checked list",
        "checkbox",
        "ro‘yxat",
      ],
      group: "Asosiy bloklar",
    },
    toggle_list: {
      title: "Yig‘iladigan ro‘yxat",
      subtext: "Yashiriladigan elementli ro‘yxat",
      aliases: ["li", "ro‘yxat", "yig‘iladigan ro‘yxat"],
      group: "Asosiy bloklar",
    },
    paragraph: {
      title: "Paragraf",
      subtext: "Asosiy matn",
      aliases: ["p", "paragraph", "paragraf"],
      group: "Asosiy bloklar",
    },
    code_block: {
      title: "Kod bloki",
      subtext: "Sintaksis yoritilishi bilan kod bloki",
      aliases: ["code", "pre", "kod bloki"],
      group: "Asosiy bloklar",
    },
    page_break: {
      title: "Sahifa bo‘linishi",
      subtext: "Sahifa ajratuvchisi",
      aliases: ["page", "break", "separator", "bo‘linish", "ajratuvchi"],
      group: "Asosiy bloklar",
    },
    table: {
      title: "Jadval",
      subtext: "Jadvallar uchun ishlatiladi",
      aliases: ["table", "jadval"],
      group: "Kengaytirilgan",
    },
    image: {
      title: "Rasm",
      subtext: "Rasm joylash",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
        "yuklash",
        "rasm",
      ],
      group: "Media",
    },
    video: {
      title: "Video",
      subtext: "Video joylash",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
        "yuklash",
        "video",
      ],
      group: "Media",
    },
    audio: {
      title: "Audio",
      subtext: "Audio joylash",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
        "yuklash",
        "audio",
        "ovoz",
        "musiqa",
      ],
      group: "Media",
    },
    file: {
      title: "Fayl",
      subtext: "Fayl joylash",
      aliases: ["file", "upload", "embed", "media", "url", "yuklash", "fayl"],
      group: "Media",
    },
    emoji: {
      title: "Emodzi",
      subtext: "Emodzi qo‘shish",
      aliases: ["emodzi", "smaylik", "ifoda", "yuz"],
      group: "Boshqa",
    },
    divider: {
      title: "Ajratuvchi",
      subtext: "Bloklar ajratuvchisi",
      aliases: ["divider", "hr", "horizontal rule"],
      group: "Asosiy bloklar",
    },
  },

  placeholders: {
    default: "Matn kiriting yoki buyruqlar uchun «/» yozing",
    heading: "Sarlavha",
    toggleListItem: "Yig‘ish",
    bulletListItem: "Ro‘yxat",
    numberedListItem: "Ro‘yxat",
    checkListItem: "Ro‘yxat",
    new_comment: "Izoh yozing...",
    edit_comment: "Izohni tahrirlash...",
    comment_reply: "Izoh qo‘shish...",
  },

  file_blocks: {
    add_button_text: {
      image: "Rasm qo‘shish",
      video: "Video qo‘shish",
      audio: "Audio qo‘shish",
      file: "Fayl qo‘shish",
    } as Record<string, string>,
  },

  toggle_blocks: {
    add_block_button: "Bo‘sh toggle. Blok qo‘shish uchun bosing.",
  },

  side_menu: {
    add_block_label: "Blok qo‘shish",
    drag_handle_label: "Blok menyusini ochish",
  },

  drag_handle: {
    delete_menuitem: "O‘chirish",
    colors_menuitem: "Ranglar",
    header_row_menuitem: "Qator sarlavhasi",
    header_column_menuitem: "Ustun sarlavhasi",
  },

  table_handle: {
    delete_column_menuitem: "Ustunni o‘chirish",
    delete_row_menuitem: "Qatorni o‘chirish",
    add_left_menuitem: "Chapga ustun qo‘shish",
    add_right_menuitem: "O‘ngga ustun qo‘shish",
    add_above_menuitem: "Yuqoriga qator qo‘shish",
    add_below_menuitem: "Pastga qator qo‘shish",
    split_cell_menuitem: "Katakni bo‘lish",
    merge_cells_menuitem: "Kataklarni birlashtirish",
    background_color_menuitem: "Fon rangi",
  },

  suggestion_menu: {
    no_items_title: "hech narsa topilmadi",
  },

  color_picker: {
    text_title: "Matn",
    background_title: "Fon",
    colors: {
      default: "Standart",
      gray: "Kulrang",
      brown: "Jigarrang",
      red: "Qizil",
      orange: "To‘q sariq",
      yellow: "Sariq",
      green: "Yashil",
      blue: "Ko‘k",
      purple: "Binafsha",
      pink: "Pushti",
    },
  },

  formatting_toolbar: {
    bold: { tooltip: "Qalin", secondary_tooltip: "Mod+B" },
    italic: { tooltip: "Kursiv", secondary_tooltip: "Mod+I" },
    underline: { tooltip: "Tagi chizilgan", secondary_tooltip: "Mod+U" },
    strike: { tooltip: "Usti chizilgan", secondary_tooltip: "Mod+Shift+X" },
    code: { tooltip: "Kod", secondary_tooltip: "" },
    colors: { tooltip: "Ranglar" },
    link: { tooltip: "Havola yaratish", secondary_tooltip: "Mod+K" },

    file_caption: {
      tooltip: "Izohni o‘zgartirish",
      input_placeholder: "Izohni o‘zgartirish",
    },

    file_replace: {
      tooltip: {
        image: "Rasmni almashtirish",
        video: "Videoni almashtirish",
        audio: "Audioni almashtirish",
        file: "Faylni almashtirish",
      },
    },

    file_rename: {
      tooltip: {
        image: "Rasm nomini o‘zgartirish",
        video: "Video nomini o‘zgartirish",
        audio: "Audio nomini o‘zgartirish",
        file: "Fayl nomini o‘zgartirish",
      },
      input_placeholder: {
        image: "Rasm nomini o‘zgartirish",
        video: "Video nomini o‘zgartirish",
        audio: "Audio nomini o‘zgartirish",
        file: "Fayl nomini o‘zgartirish",
      },
    },

    file_download: {
      tooltip: {
        image: "Rasmni yuklab olish",
        video: "Videoni yuklab olish",
        audio: "Audioni yuklab olish",
        file: "Faylni yuklab olish",
      },
    },

    file_delete: {
      tooltip: {
        image: "Rasmni o‘chirish",
        video: "Videoni o‘chirish",
        audio: "Audioni o‘chirish",
        file: "Faylni o‘chirish",
      },
    },

    file_preview_toggle: {
      tooltip: "Oldindan ko‘rishni almashtirish",
    },

    nest: { tooltip: "O‘ngga surish", secondary_tooltip: "Tab" },
    unnest: { tooltip: "Chapga surish", secondary_tooltip: "Shift+Tab" },

    align_left: { tooltip: "Chapga tekislash" },
    align_center: { tooltip: "Markazga tekislash" },
    align_right: { tooltip: "O‘ngga tekislash" },
    align_justify: { tooltip: "Eniga tekislash" },

    table_cell_merge: { tooltip: "Kataklarni birlashtirish" },
    comment: { tooltip: "Izoh qo‘shish" },
  },

  file_panel: {
    upload: {
      title: "Yuklash",
      file_placeholder: {
        image: "Rasmlarni yuklash",
        video: "Videolarni yuklash",
        audio: "Audiolarni yuklash",
        file: "Faylni yuklash",
      },
      upload_error: "Xatolik: yuklab bo‘lmadi",
    },

    embed: {
      title: "Joylash",
      embed_button: {
        image: "Rasmni joylash",
        video: "Videoni joylash",
        audio: "Audioni joylash",
        file: "Faylni joylash",
      },
      url_placeholder: "URL kiriting",
    },
  },

  link_toolbar: {
    delete: { tooltip: "Havolani o‘chirish" },
    edit: { text: "Havolani o‘zgartirish", tooltip: "Tahrirlash" },
    open: { tooltip: "Yangi oynada ochish" },
    form: {
      title_placeholder: "Sarlavhani o‘zgartirish",
      url_placeholder: "URLni o‘zgartirish",
    },
  },

  comments: {
    edited: "tahrirlangan",
    save_button_text: "Saqlash",
    cancel_button_text: "Bekor qilish",
    actions: {
      add_reaction: "Reaksiya qo‘shish",
      resolve: "Hal qilish",
      edit_comment: "Izohni tahrirlash",
      delete_comment: "Izohni o‘chirish",
      more_actions: "Boshqa amallar",
    },
    reactions: {
      reacted_by: "Reaksiya bildirgan",
    },
    sidebar: {
      marked_as_resolved: "Hal qilingan deb belgilandi",
      more_replies: (count) => `${count} ta qo‘shimcha javob`,
    },
  },

  generic: {
    ctrl_shortcut: "Ctrl",
  },
};