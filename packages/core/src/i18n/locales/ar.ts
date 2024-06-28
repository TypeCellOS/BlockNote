import type { Dictionary } from "../dictionary";

export const ar: Dictionary = {
  slash_menu: {
    heading: {
      title: "العنوان 1",
      subtext: "يستخدم للعنوان الرئيسي",
      aliases: ["h", "heading1", "h1", "عنوان رئيسي", "عنوان 1"],
      group: "العناوين",
    },
    heading_2: {
      title: "العنوان 2",
      subtext: "يستخدم للأقسام الرئيسية",
      aliases: ["h2", "heading2", "subheading", "عنوان 2", "عنوان فرعي"],
      group: "العناوين",
    },
    heading_3: {
      title: "العنوان 3",
      subtext: "يستخدم للأقسام الفرعية وعناوين المجموعات",
      aliases: ["h3", "heading3", "subheading", "عنوان 3", "عنوان فرعي"],
      group: "العناوين",
    },
    numbered_list: {
      title: "قائمة مرقمة",
      subtext: "يستخدم لعرض قائمة مرقمة",
      aliases: [
        "ol",
        "li",
        "list",
        "numberedlist",
        "numbered list",
        "قائمة",
        "قائمة مرقمة",
      ],
      group: "الكتل الأساسية",
    },
    bullet_list: {
      title: "قائمة نقاط",
      subtext: "يستخدم لعرض قائمة غير مرتبة",
      aliases: [
        "ul",
        "li",
        "list",
        "bulletlist",
        "bullet list",
        "قائمة",
        "قائمة نقاط",
      ],
      group: "الكتل الأساسية",
    },
    check_list: {
      title: "قائمة الاختيار",
      subtext: "يستخدم لعرض قائمة مع مربعات الاختيار",
      aliases: [
        "ul",
        "li",
        "list",
        "checklist",
        "check list",
        "checked list",
        "checkbox",
        "قائمة",
        "قائمة الاختيار",
        "قائمة مربعات الاختيار",
      ],
      group: "الكتل الأساسية",
    },
    paragraph: {
      title: "فقرة",
      subtext: "يستخدم لجسم المستند الخاص بك",
      aliases: ["p", "paragraph", "فقرة", "نص"],
      group: "الكتل الأساسية",
    },
    table: {
      title: "جدول",
      subtext: "يستخدم للجداول",
      aliases: ["table", "جدول", "جداول"],
      group: "متقدم",
    },
    image: {
      title: "صورة",
      subtext: "أدرج صورة",
      aliases: [
        "صورة",
        "رفع الصورة",
        "رفع",
        "image",
        "upload",
        "img",
        "picture",
        "media",
        "url",
      ],
      group: "الوسائط",
    },
    video: {
      title: "فيديو",
      subtext: "أدرج فيديو",
      aliases: [
        "فيديو",
        "رفع الفيديو",
        "رفع",
        "video",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
      ],
      group: "الوسائط",
    },
    audio: {
      title: "صوت",
      subtext: "أدرج صوت",
      aliases: [
        "صوت",
        "رفع الصوت",
        "رفع",
        "audio",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
      ],
      group: "الوسائط",
    },
    file: {
      title: "ملف",
      subtext: "أدرج ملف",
      aliases: ["file", "upload", "embed", "media", "url", "ملف", "رفع"],
      group: "الوسائط",
    },
    emoji: {
      title: "الرموز التعبيرية",
      subtext: "تُستخدم لإدراج رمز تعبيري",
      aliases: ["رمز تعبيري", "إيموجي", "إيموت", "عاطفة", "وجه"],
      group: "آخرون",
    },
  },
  placeholders: {
    default: "أدخل النص أو اكتب '/' للأوامر",
    heading: "العنوان",
    bulletListItem: "قائمة",
    numberedListItem: "قائمة",
    checkListItem: "قائمة",
  },
  file_blocks: {
    image: {
      add_button_text: "أضف صورة",
    },
    video: {
      add_button_text: "أضف فيديو",
    },
    audio: {
      add_button_text: "أضف صوت",
    },
    file: {
      add_button_text: "أضف ملف",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "أضف كتلة",
    drag_handle_label: "افتح قائمة الكتل",
  },
  drag_handle: {
    delete_menuitem: "حذف",
    colors_menuitem: "الألوان",
  },
  table_handle: {
    delete_column_menuitem: "حذف العمود",
    delete_row_menuitem: "حذف الصف",
    add_left_menuitem: "أضف عموداً على اليسار",
    add_right_menuitem: "أضف عموداً على اليمين",
    add_above_menuitem: "أضف صفاً أعلى",
    add_below_menuitem: "أضف صفاً أسفل",
  },
  suggestion_menu: {
    no_items_title: "لم يتم العثور على عناصر",
    loading: "جار التحميل...",
  },
  color_picker: {
    text_title: "النص",
    background_title: "الخلفية",
    colors: {
      default: "الافتراضي",
      gray: "رمادي",
      brown: "بني",
      red: "أحمر",
      orange: "برتقالي",
      yellow: "أصفر",
      green: "أخضر",
      blue: "أزرق",
      purple: "بنفسجي",
      pink: "وردي",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "عريض",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "مائل",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "تسطير",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "شطب",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "كود",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "الألوان",
    },
    link: {
      tooltip: "إنشاء رابط",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "تعديل التسمية التوضيحية",
      input_placeholder: "تعديل التسمية التوضيحية",
    },
    file_replace: {
      tooltip: {
        image: "استبدال الصورة",
        video: "استبدال الفيديو",
        audio: "استبدال الصوت",
        file: "استبدال الملف",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "إعادة تسمية الصورة",
        video: "إعادة تسمية الفيديو",
        audio: "إعادة تسمية الصوت",
        file: "إعادة تسمية الملف",
      } as Record<string, string>,
      input_placeholder: {
        image: "إعادة تسمية الصورة",
        video: "إعادة تسمية الفيديو",
        audio: "إعادة تسمية الصوت",
        file: "إعادة تسمية الملف",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "تحميل الصورة",
        video: "تحميل الفيديو",
        audio: "تحميل الصوت",
        file: "تحميل الملف",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "حذف الصورة",
        video: "حذف الفيديو",
        audio: "حذف الصوت",
        file: "حذف الملف",
      } as Record<string, string>,
    },
    file_preview_toggle: {
      tooltip: "تبديل العرض",
    },
    nest: {
      tooltip: "تداخل الكتل",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "إلغاء تداخل الكتل",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "محاذاة النص إلى اليسار",
    },
    align_center: {
      tooltip: "محاذاة النص إلى الوسط",
    },
    align_right: {
      tooltip: "محاذاة النص إلى اليمين",
    },
    align_justify: {
      tooltip: "ضبط النص",
    },
  },
  file_panel: {
    upload: {
      title: "تحميل",
      file_placeholder: {
        image: "تحميل الصورة",
        video: "تحميل الفيديو",
        audio: "تحميل الصوت",
        file: "تحميل الملف",
      } as Record<string, string>,
      upload_error: "خطأ: فشل التحميل",
    },
    embed: {
      title: "تضمين",
      embed_button: {
        image: "تضمين الصورة",
        video: "تضمين الفيديو",
        audio: "تضمين الصوت",
        file: "تضمين الملف",
      } as Record<string, string>,
      url_placeholder: "أدخل الرابط",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "إزالة الرابط",
    },
    edit: {
      text: "تعديل الرابط",
      tooltip: "تعديل",
    },
    open: {
      tooltip: "افتح في علامة تبويب جديدة",
    },
    form: {
      title_placeholder: "تعديل العنوان",
      url_placeholder: "تعديل الرابط",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
