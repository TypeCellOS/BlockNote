import { Dictionary } from "../dictionary";

export const ru: Dictionary = {
  slash_menu: {
    heading: {
      title: "Заголовок 1 уровня",
      subtext: "Используется для заголовка верхнего уровня",
      aliases: ["h", "heading1", "h1", "заголовок1"],
      group: "Заголовки",
    },
    heading_2: {
      title: "Заголовок 2 уровня",
      subtext: "Используется для ключевых разделов",
      aliases: ["h2", "heading2", "subheading", "заголовок2", "подзаголовок"],
      group: "Заголовки",
    },
    heading_3: {
      title: "Заголовок 3 уровня",
      subtext: "Используется для подразделов и групп",
      aliases: ["h3", "heading3", "subheading", "заголовок3", "подзаголовок"],
      group: "Заголовки",
    },
    numbered_list: {
      title: "Нумерованный список",
      subtext: "Используется для отображения нумерованного списка",
      aliases: [
        "ol",
        "li",
        "list",
        "numberedlist",
        "numbered list",
        "список",
        "нумерованный список",
      ],
      group: "Базовые блоки",
    },
    bullet_list: {
      title: "Маркированный список",
      subtext: "Для отображения неупорядоченного списка.",
      aliases: [
        "ul",
        "li",
        "list",
        "bulletlist",
        "bullet list",
        "список",
        "маркированный список",
      ],
      group: "Базовые блоки",
    },
    check_list: {
      title: "Контрольный список",
      subtext: "Для отображения списка с флажками",
      aliases: [
        "ul",
        "li",
        "list",
        "checklist",
        "check list",
        "checked list",
        "checkbox",
        "список",
      ],
      group: "Базовые блоки",
    },
    paragraph: {
      title: "Параграф",
      subtext: "Основной текст",
      aliases: ["p", "paragraph", "параграф"],
      group: "Базовые блоки",
    },
    table: {
      title: "Таблица",
      subtext: "Используется для таблиц",
      aliases: ["table", "таблица"],
      group: "Продвинутый",
    },
    image: {
      title: "Картинка",
      subtext: "Вставить изображение",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
        "загрузка",
        "картинка",
        "рисунок",
      ],
      group: "Медиа",
    },
    video: {
      title: "Видео",
      subtext: "Вставить видео",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
        "загрузка",
        "видео",
      ],
      group: "Медиа",
    },
    audio: {
      title: "Аудио",
      subtext: "Вставить аудио",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
        "загрузка",
        "аудио",
        "звук",
        "музыка",
      ],
      group: "Медиа",
    },
    file: {
      title: "Файл",
      subtext: "Вставить файл",
      aliases: ["file", "upload", "embed", "media", "url", "загрузка", "файл"],
      group: "Медиа",
    },
    emoji: {
      title: "Эмодзи",
      subtext: "Используется для вставки эмодзи",
      aliases: ["эмодзи", "смайлик", "выражение эмоций", "лицо"],
      group: "Прочее",
    },
  },
  placeholders: {
    default: "Ведите текст или введите «/» для команд",
    heading: "Заголовок",
    bulletListItem: "Список",
    numberedListItem: "Список",
    checkListItem: "Список",
  },
  file_blocks: {
    image: {
      add_button_text: "Добавить изображение",
    },
    video: {
      add_button_text: "Добавить видео",
    },
    audio: {
      add_button_text: "Добавить аудио",
    },
    file: {
      add_button_text: "Добавить файл",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "Добавить блок",
    drag_handle_label: "Открыть меню блока",
  },
  drag_handle: {
    delete_menuitem: "Удалить",
    colors_menuitem: "Цвета",
  },
  table_handle: {
    delete_column_menuitem: "Удалить столбец",
    delete_row_menuitem: "Удалить строку",
    add_left_menuitem: "Добавить столбец слева",
    add_right_menuitem: "Добавить столбец справа",
    add_above_menuitem: "Добавить строку выше",
    add_below_menuitem: "Добавить строку ниже",
  },
  suggestion_menu: {
    no_items_title: "ничего не найдено",
    loading: "Загрузка…",
  },
  color_picker: {
    text_title: "Текст",
    background_title: "Задний фон",
    colors: {
      default: "По умолчинию",
      gray: "Серый",
      brown: "Коричневый",
      red: "Красный",
      orange: "Оранжевый",
      yellow: "Жёлтый",
      green: "Зелёный",
      blue: "Голубой",
      purple: "Фиолетовый",
      pink: "Розовый",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Жирный",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Курсив",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Подчёркнутый",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Зачёркнутый",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Код",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Цвета",
    },
    link: {
      tooltip: "Создать ссылку",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Изменить подпись",
      input_placeholder: "Изменить подпись",
    },
    file_replace: {
      tooltip: {
        image: "Заменить изображение",
        video: "Заменить видео",
        audio: "Заменить аудио",
        file: "Заменить файл",
      },
    },
    file_rename: {
      tooltip: {
        image: "Переименовать изображение",
        video: "Переименовать видео",
        audio: "Переименовать аудио",
        file: "Переименовать файл",
      },
      input_placeholder: {
        image: "Переименовать изображение",
        video: "Переименовать видео",
        audio: "Переименовать аудио",
        file: "Переименовать файл",
      },
    },
    file_download: {
      tooltip: {
        image: "Скачать картинку",
        video: "Скачать видео",
        audio: "Скачать аудио",
        file: "Скачать файл",
      },
    },
    file_delete: {
      tooltip: {
        image: "Удалить картинку",
        video: "Удалить видео",
        audio: "Удалить аудио",
        file: "Скачать файл",
      },
    },
    file_preview_toggle: {
      tooltip: "Переключить предварительный просмотр",
    },
    nest: {
      tooltip: "Сдвинуть вправо",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Сдвинуть влево",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Текст по левому краю",
    },
    align_center: {
      tooltip: "Текст по середине",
    },
    align_right: {
      tooltip: "Текст по правому краю",
    },
    align_justify: {
      tooltip: "По середине текст",
    },
  },
  file_panel: {
    upload: {
      title: "Загрузить",
      file_placeholder: {
        image: "Загрузить картинки",
        video: "Загрузить видео",
        audio: "Загрузить аудио",
        file: "Загрузить файл",
      },
      upload_error: "Ошибка: не удалось загрузить",
    },
    embed: {
      title: "Вставить",
      embed_button: {
        image: "Вставить картинку",
        video: "Вставить видео",
        audio: "Вставить аудио",
        file: "Вставить файл",
      },
      url_placeholder: "Введите URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Удалить ссылку",
    },
    edit: {
      text: "Изменить ссылку",
      tooltip: "Редактировать",
    },
    open: {
      tooltip: "Открыть в новой вкладке",
    },
    form: {
      title_placeholder: "Изменить заголовок",
      url_placeholder: "Изменить URL",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
