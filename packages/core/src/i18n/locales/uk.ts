import { Dictionary } from "../dictionary.js";

export const uk: Dictionary = {
  slash_menu: {
    heading: {
      title: "Заголовок 1",
      subtext: "Заголовок найвищого рівня",
      aliases: ["h", "heading1", "h1", "заголовок1"],
      group: "Заголовки",
    },
    heading_2: {
      title: "Заголовок 2",
      subtext: "Основний заголовок розділу",
      aliases: ["h2", "heading2", "subheading", "заголовок2"],
      group: "Заголовки",
    },
    heading_3: {
      title: "Заголовок 3",
      subtext: "Підзаголовок і груповий заголовок",
      aliases: ["h3", "heading3", "subheading", "заголовок3"],
      group: "Заголовки",
    },
    heading_4: {
      title: "Заголовок 4",
      subtext: "Використовується для менших підрозділів",
      aliases: ["h4", "heading4", "subheading4", "заголовок4"],
      group: "Підзаголовки",
    },
    heading_5: {
      title: "Заголовок 5",
      subtext: "Використовується для заголовків менших підрозділів",
      aliases: ["h5", "heading5", "subheading5", "заголовок5", "підзаголовок5"],
      group: "Підзаголовки",
    },
    heading_6: {
      title: "Заголовок 6",
      subtext: "Використовується для заголовків найнижчого рівня",
      aliases: ["h6", "heading6", "subheading6", "заголовок6", "підзаголовок6"],
      group: "Підзаголовки",
    },
    toggle_heading: {
      title: "Розгортаємий заголовок 1",
      subtext: "Розгортаємий заголовок найвищого рівня",
      aliases: ["h", "heading1", "h1", "заголовок1", "розгортаємий"],
      group: "Підзаголовки",
    },
    toggle_heading_2: {
      title: "Розгортаємий заголовок 2",
      subtext: "Розгортаємий основний заголовок розділу",
      aliases: ["h2", "heading2", "subheading", "заголовок2", "розгортаємий"],
      group: "Підзаголовки",
    },
    toggle_heading_3: {
      title: "Розгортаємий заголовок 3",
      subtext: "Розгортаємий підзаголовок і груповий заголовок",
      aliases: ["h3", "heading3", "subheading", "заголовок3", "розгортаємий"],
      group: "Підзаголовки",
    },
    quote: {
      title: "Цитата",
      subtext: "Цитата або уривок",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Базові блоки",
    },
    numbered_list: {
      title: "Нумерований список",
      subtext: "Список із впорядкованими елементами",
      aliases: [
        "ol",
        "li",
        "list",
        "numberedlist",
        "numbered list",
        "список",
        "нумерований список",
      ],
      group: "Базові блоки",
    },
    bullet_list: {
      title: "Маркований список",
      subtext: "Список із невпорядкованими елементами",
      aliases: [
        "ul",
        "li",
        "list",
        "bulletlist",
        "bullet list",
        "список",
        "маркований список",
      ],
      group: "Базові блоки",
    },
    check_list: {
      title: "Чек-лист",
      subtext: "Список із чекбоксами",
      aliases: [
        "ul",
        "li",
        "list",
        "checklist",
        "check list",
        "checked list",
        "checkbox",
        "чекбокс",
        "чек-лист",
      ],
      group: "Базові блоки",
    },
    toggle_list: {
      title: "Розгортаємий список",
      subtext: "Список із прихованими підпунктами",
      aliases: ["li", "список", "розгортаємий список", "складений список"],
      group: "Базові блоки",
    },
    paragraph: {
      title: "Параграф",
      subtext: "Основний текст документа",
      aliases: ["p", "paragraph", "параграф"],
      group: "Базові блоки",
    },
    code_block: {
      title: "Блок коду",
      subtext: "Блок коду з підсвіткою синтаксису",
      aliases: ["code", "pre", "блок коду"],
      group: "Базові блоки",
    },
    page_break: {
      title: "Розрив сторінки",
      subtext: "Роздільник сторінки",
      aliases: ["page", "break", "separator", "розрив сторінки", "розділювач"],
      group: "Базові блоки",
    },
    table: {
      title: "Таблиця",
      subtext: "Таблиця з редагованими клітинками",
      aliases: ["table", "таблиця"],
      group: "Розширені",
    },
    image: {
      title: "Зображення",
      subtext: "Масштабоване зображення з підписом",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
        "зображення",
        "медіа",
      ],
      group: "Медіа",
    },
    video: {
      title: "Відео",
      subtext: "Масштабоване відео з підписом",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
        "відео",
        "медіа",
      ],
      group: "Медіа",
    },
    audio: {
      title: "Аудіо",
      subtext: "Вбудоване аудіо з підписом",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
        "аудіо",
        "медіа",
      ],
      group: "Медіа",
    },
    file: {
      title: "Файл",
      subtext: "Вбудований файл",
      aliases: ["file", "upload", "embed", "media", "url", "файл", "медіа"],
      group: "Медіа",
    },
    emoji: {
      title: "Емодзі",
      subtext: "Пошук і вставка емодзі",
      aliases: ["emoji", "emote", "emotion", "face", "смайлик", "емодзі"],
      group: "Інше",
    },
  },
  placeholders: {
    default: "Введіть текст або наберіть '/' для команд",
    heading: "Заголовок",
    toggleListItem: "Перемикач",
    bulletListItem: "Список",
    numberedListItem: "Список",
    checkListItem: "Список",
    new_comment: "Напишіть коментар...",
    edit_comment: "Редагувати коментар...",
    comment_reply: "Додати коментар...",
  },
  file_blocks: {
    image: {
      add_button_text: "Додати зображення",
    },
    video: {
      add_button_text: "Додати відео",
    },
    audio: {
      add_button_text: "Додати аудіо",
    },
    file: {
      add_button_text: "Додати файл",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "Додати блок",
    drag_handle_label: "Відкрити меню блока",
  },
  drag_handle: {
    delete_menuitem: "Видалити",
    colors_menuitem: "Кольори",
    header_row_menuitem: "Заголовок рядка",
    header_column_menuitem: "Заголовок стовпця",
  },
  table_handle: {
    delete_column_menuitem: "Видалити стовпець",
    delete_row_menuitem: "Видалити рядок",
    add_left_menuitem: "Додати стовпець зліва",
    add_right_menuitem: "Додати стовпець справа",
    add_above_menuitem: "Додати рядок вище",
    add_below_menuitem: "Додати рядок нижче",
    split_cell_menuitem: "Розділити клітинку",
    merge_cells_menuitem: "Об'єднати клітинки",
    background_color_menuitem: "Змінити колір фону",
  },
  suggestion_menu: {
    no_items_title: "Нічого не знайдено",
  },
  color_picker: {
    text_title: "Текст",
    background_title: "Фон",
    colors: {
      default: "За замовчуванням",
      gray: "Сірий",
      brown: "Коричневий",
      red: "Червоний",
      orange: "Помаранчевий",
      yellow: "Жовтий",
      green: "Зелений",
      blue: "Блакитний",
      purple: "Фіолетовий",
      pink: "Рожевий",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "Жирний",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Курсив",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Підкреслений",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Закреслений",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Код",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Кольори",
    },
    link: {
      tooltip: "Створити посилання",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Редагувати підпис",
      input_placeholder: "Редагувати підпис",
    },
    file_replace: {
      tooltip: {
        image: "Замінити зображення",
        video: "Замінити відео",
        audio: "Замінити аудіо",
        file: "Замінити файл",
      },
    },
    file_rename: {
      tooltip: {
        image: "Перейменувати зображення",
        video: "Перейменувати відео",
        audio: "Перейменувати аудіо",
        file: "Перейменувати файл",
      },
      input_placeholder: {
        image: "Перейменувати зображення",
        video: "Перейменувати відео",
        audio: "Перейменувати аудіо",
        file: "Перейменувати файл",
      },
    },
    file_download: {
      tooltip: {
        image: "Завантажити зображення",
        video: "Завантажити відео",
        audio: "Завантажити аудіо",
        file: "Завантажити файл",
      },
    },
    file_delete: {
      tooltip: {
        image: "Видалити зображення",
        video: "Видалити відео",
        audio: "Видалити аудіо",
        file: "Видалити файл",
      },
    },
    file_preview_toggle: {
      tooltip: "Перемкнути попередній перегляд",
    },
    nest: {
      tooltip: "Вкладений блок",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Розгрупувати блок",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Вирівняти за лівим краєм",
    },
    align_center: {
      tooltip: "Вирівняти по центру",
    },
    align_right: {
      tooltip: "Вирівняти за правим краєм",
    },
    align_justify: {
      tooltip: "Вирівняти за шириною",
    },
    table_cell_merge: {
      tooltip: "Об'єднати клітинки",
    },
    comment: {
      tooltip: "Додати коментар",
    },
  },
  file_panel: {
    upload: {
      title: "Завантажити",
      file_placeholder: {
        image: "Завантажити зображення",
        video: "Завантажити відео",
        audio: "Завантажити аудіо",
        file: "Завантажити файл",
      },
      upload_error: "Помилка: не вдалося завантажити",
    },
    embed: {
      title: "Вставити",
      embed_button: {
        image: "Вставити зображення",
        video: "Вставити відео",
        audio: "Вставити аудіо",
        file: "Вставити файл",
      },
      url_placeholder: "Введіть URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Видалити посилання",
    },
    edit: {
      text: "Редагувати посилання",
      tooltip: "Редагувати",
    },
    open: {
      tooltip: "Відкрити в новій вкладці",
    },
    form: {
      title_placeholder: "Редагувати заголовок",
      url_placeholder: "Редагувати URL",
    },
  },
  comments: {
    edited: "відредаговано",
    save_button_text: "Зберегти",
    cancel_button_text: "Скасувати",
    actions: {
      add_reaction: "Додати реакцію",
      resolve: "Вирішити",
      edit_comment: "Редагувати коментар",
      delete_comment: "Видалити коментар",
      more_actions: "Більше дій",
    },
    reactions: {
      reacted_by: "Відреагував(ла)",
    },
    sidebar: {
      marked_as_resolved: "Позначено як вирішене",
      more_replies: (count) => `${count} додаткових відповідей`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
