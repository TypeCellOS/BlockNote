import type { Dictionary } from "../dictionary.js";

export const ar: Dictionary = {
  slash_menu: {
    heading: {
      title: "عنوان 1",
      subtext: "يستخدم لعناوين المستوى الأعلى",
      aliases: ["ع", "عنوان1", "ع1"],
      group: "العناوين",
    },
    heading_2: {
      title: "عنوان 2",
      subtext: "يستخدم للأقسام الرئيسية",
      aliases: ["ع2", "عنوان2", "عنوان فرعي"],
      group: "العناوين",
    },
    heading_3: {
      title: "عنوان 3",
      subtext: "يستخدم للأقسام الفرعية والعناوين المجموعة",
      aliases: ["ع3", "عنوان3", "عنوان فرعي"],
      group: "العناوين",
    },
    heading_4: {
      title: "عنوان 4",
      subtext: "عنوان فرعي ثانوي صغير",
      aliases: ["ع4", "عنوان4", "عنوان فرعي صغير"],
      group: "العناوين الفرعية",
    },
    heading_5: {
      title: "عنوان 5",
      subtext: "عنوان فرعي صغير",
      aliases: ["ع5", "عنوان5", "عنوان فرعي صغير"],
      group: "العناوين الفرعية",
    },
    heading_6: {
      title: "عنوان 6",
      subtext: "أدنى مستوى للعناوين",
      aliases: ["ع6", "عنوان6", "العنوان الفرعي الأدنى"],
      group: "العناوين الفرعية",
    },
    toggle_heading: {
      title: "عنوان قابل للطي 1",
      subtext: "عنوان قابل للطي لإظهار وإخفاء المحتوى",
      aliases: ["ع", "عنوان1", "ع1", "قابل للطي", "طي"],
      group: "العناوين الفرعية",
    },
    toggle_heading_2: {
      title: "عنوان قابل للطي 2",
      subtext: "عنوان فرعي قابل للطي لإظهار وإخفاء المحتوى",
      aliases: ["ع2", "عنوان2", "عنوان فرعي", "قابل للطي", "طي"],
      group: "العناوين الفرعية",
    },
    toggle_heading_3: {
      title: "عنوان قابل للطي 3",
      subtext: "عنوان فرعي ثانوي قابل للطي لإظهار وإخفاء المحتوى",
      aliases: ["ع3", "عنوان3", "عنوان فرعي", "قابل للطي", "طي"],
      group: "العناوين الفرعية",
    },
    quote: {
      title: "اقتباس",
      subtext: "اقتباس أو مقتطف",
      aliases: ["quotation", "blockquote", "bq"],
      group: "الكتل الأساسية",
    },
    numbered_list: {
      title: "قائمة مرقمة",
      subtext: "تستخدم لعرض قائمة مرقمة",
      aliases: ["ق", "عناصر قائمة", "قائمة", "قائمة مرقمة"],
      group: "الكتل الأساسية",
    },
    bullet_list: {
      title: "قائمة نقطية",
      subtext: "تستخدم لعرض قائمة غير مرتبة",
      aliases: ["ق", "عناصر قائمة", "قائمة", "قائمة نقطية"],
      group: "الكتل الأساسية",
    },
    check_list: {
      title: "قائمة تحقق",
      subtext: "تستخدم لعرض قائمة بمربعات التحقق",
      aliases: [
        "قوائم غير مرتبة",
        "عناصر قائمة",
        "قائمة",
        "قائمة تحقق",
        "قائمة التحقق",
        "قائمة مشطوبة",
        "مربع التحقق",
      ],
      group: "الكتل الأساسية",
    },
    toggle_list: {
      title: "قائمة قابلة للطي",
      subtext: "قائمة بعناصر فرعية قابلة للإخفاء",
      aliases: ["عناصر قائمة", "قائمة", "قائمة قابلة للطي", "قائمة منسدلة"],
      group: "الكتل الأساسية",
    },
    paragraph: {
      title: "فقرة",
      subtext: "تستخدم لنص الوثيقة الأساسي",
      aliases: ["ف", "فقرة"],
      group: "الكتل الأساسية",
    },
    code_block: {
      title: "كود",
      subtext: "يستخدم لعرض الكود مع تحديد الصيغة",
      aliases: ["كود", "مسبق"],
      group: "الكتل الأساسية",
    },
    page_break: {
      title: "فاصل الصفحة",
      subtext: "فاصل الصفحة",
      aliases: ["page", "break", "separator", "فاصل", "الصفحة"],
      group: "الكتل الأساسية",
    },
    table: {
      title: "جدول",
      subtext: "يستخدم للجداول",
      aliases: ["جدول"],
      group: "متقدم",
    },
    image: {
      title: "صورة",
      subtext: "إدراج صورة",
      aliases: ["صورة", "رفع صورة", "تحميل", "صورة", "صورة", "وسائط", "رابط"],
      group: "وسائط",
    },
    video: {
      title: "فيديو",
      subtext: "إدراج فيديو",
      aliases: [
        "فيديو",
        "رفع فيديو",
        "تحميل",
        "فيديو",
        "فيلم",
        "وسائط",
        "رابط",
      ],
      group: "وسائط",
    },
    audio: {
      title: "صوت",
      subtext: "إدراج صوت",
      aliases: ["صوت", "رفع صوت", "تحميل", "صوت", "صوت", "وسائط", "رابط"],
      group: "وسائط",
    },
    file: {
      title: "ملف",
      subtext: "إدراج ملف",
      aliases: ["ملف", "تحميل", "تضمين", "وسائط", "رابط"],
      group: "وسائط",
    },
    emoji: {
      title: "الرموز التعبيرية",
      subtext: "تُستخدم لإدراج رمز تعبيري",
      aliases: ["رمز تعبيري", "إيموجي", "إيموت", "عاطفة", "وجه"],
      group: "آخرون",
    },
    divider: {
      title: "فاصل",
      subtext: "يستخدم لفصل الكتل",
      aliases: ["فاصل", "فاصل", "فاصل", "فاصل"],
      group: "الكتل الأساسية",
    },
  },
  placeholders: {
    default: "أدخل نصًا أو اكتب '/' للأوامر",
    heading: "عنوان",
    toggleListItem: "طيّ",
    bulletListItem: "قائمة",
    numberedListItem: "قائمة",
    checkListItem: "قائمة",
    new_comment: "اكتب تعليقًا...",
    edit_comment: "تحرير التعليق...",
    comment_reply: "أضف تعليقًا...",
  },
  file_blocks: {
    add_button_text: {
      image: "إضافة صورة",
      video: "إضافة فيديو",
      audio: "إضافة صوت",
      file: "إضافة ملف",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "تبديل فارغ. انقر لإضافة كتلة.",
  },
  // from react package:
  side_menu: {
    add_block_label: "إضافة محتوي",
    drag_handle_label: "فتح قائمة المحتويات",
  },
  drag_handle: {
    delete_menuitem: "حذف",
    colors_menuitem: "ألوان",
    header_row_menuitem: "عنوان الصف",
    header_column_menuitem: "عنوان العمود",
  },
  table_handle: {
    delete_column_menuitem: "حذف عمود",
    delete_row_menuitem: "حذف صف",
    add_left_menuitem: "إضافة عمود إلى اليسار",
    add_right_menuitem: "إضافة عمود إلى اليمين",
    add_above_menuitem: "إضافة صف أعلى",
    add_below_menuitem: "إضافة صف أسفل",
    split_cell_menuitem: "تقسيم الخلية",
    merge_cells_menuitem: "جمع الخلايا",
    background_color_menuitem: "لون الخلفية",
  },
  suggestion_menu: {
    no_items_title: "لم يتم العثور على عناصر",
  },
  color_picker: {
    text_title: "نص",
    background_title: "خلفية",
    colors: {
      default: "افتراضي",
      gray: "رمادي",
      brown: "بني",
      red: "أحمر",
      orange: "برتقالي",
      yellow: "أصفر",
      green: "أخضر",
      blue: "أزرق",
      purple: "أرجواني",
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
      tooltip: "تحته خط",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "مشطوب",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "كود",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "ألوان",
    },
    link: {
      tooltip: "إنشاء رابط",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "تحرير التسمية التوضيحية",
      input_placeholder: "تحرير التسمية التوضيحية",
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
        image: "تنزيل الصورة",
        video: "تنزيل الفيديو",
        audio: "تنزيل الصوت",
        file: "تنزيل الملف",
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
      tooltip: "تبديل المعاينة",
    },
    nest: {
      tooltip: "محتويات متداخلة",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "إلغاء التداخل",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "محاذاة النص إلى اليسار",
    },
    align_center: {
      tooltip: "محاذاة النص في المنتصف",
    },
    align_right: {
      tooltip: "محاذاة النص إلى اليمين",
    },
    align_justify: {
      tooltip: "ضبط النص",
    },
    table_cell_merge: {
      tooltip: "جمع الخلايا",
    },
    comment: {
      tooltip: "إضافة ملاحظة",
    },
  },
  file_panel: {
    upload: {
      title: "تحميل",
      file_placeholder: {
        image: "تحميل صورة",
        video: "تحميل فيديو",
        audio: "تحميل صوت",
        file: "تحميل ملف",
      } as Record<string, string>,
      upload_error: "خطأ: فشل التحميل",
    },
    embed: {
      title: "تضمين",
      embed_button: {
        image: "تضمين صورة",
        video: "تضمين فيديو",
        audio: "تضمين صوت",
        file: "تضمين ملف",
      } as Record<string, string>,
      url_placeholder: "أدخل الرابط",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "إزالة الرابط",
    },
    edit: {
      text: "تحرير الرابط",
      tooltip: "تحرير",
    },
    open: {
      tooltip: "فتح في تبويب جديد",
    },
    form: {
      title_placeholder: "تحرير العنوان",
      url_placeholder: "تحرير الرابط",
    },
  },
  comments: {
    edited: "تم التحرير",
    save_button_text: "حفظ",
    cancel_button_text: "إلغاء",
    actions: {
      add_reaction: "أضف تفاعلًا",
      resolve: "حل",
      edit_comment: "تحرير التعليق",
      delete_comment: "حذف التعليق",
      more_actions: "المزيد من الإجراءات",
    },
    reactions: {
      reacted_by: "تفاعل بواسطة",
    },
    sidebar: {
      marked_as_resolved: "تم وضع علامة كتم الحل",
      more_replies: (count) => `${count} ردود أخرى`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
