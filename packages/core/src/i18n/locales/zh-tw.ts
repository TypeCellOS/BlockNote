import type { Dictionary } from "../dictionary.js";

export const zhTW: Dictionary = {
  slash_menu: {
    heading: {
      title: "一級標題",
      subtext: "用於頂級標題",
      aliases: ["h", "heading1", "h1", "標題", "一級標題"],
      group: "標題",
    },
    heading_2: {
      title: "二級標題",
      subtext: "用於關鍵部分",
      aliases: ["h2", "heading2", "subheading", "標題", "二級標題", "副標題"],
      group: "標題",
    },
    heading_3: {
      title: "三級標題",
      subtext: "用於小節和分組標題",
      aliases: ["h3", "heading3", "subheading", "標題", "三級標題"],
      group: "標題",
    },
    heading_4: {
      title: "四級標題",
      subtext: "用於小節和分組標題",
      aliases: ["h4", "heading4", "subheading", "標題", "四級標題"],
      group: "副標題",
    },
    heading_5: {
      title: "五級標題",
      subtext: "用於小節和分組標題",
      aliases: ["h5", "heading5", "subheading", "標題", "五級標題"],
      group: "副標題",
    },
    heading_6: {
      title: "六級標題",
      subtext: "用於小節和分組標題",
      aliases: ["h6", "heading6", "subheading", "標題", "六級標題"],
      group: "副標題",
    },
    toggle_heading: {
      title: "可摺疊一級標題",
      subtext: "可摺疊的頂級標題",
      aliases: ["h", "heading1", "h1", "標題", "一級標題", "摺疊"],
      group: "副標題",
    },
    toggle_heading_2: {
      title: "可摺疊二級標題",
      subtext: "可摺疊的關鍵部分標題",
      aliases: [
        "h2",
        "heading2",
        "subheading",
        "標題",
        "二級標題",
        "副標題",
        "摺疊",
      ],
      group: "副標題",
    },
    toggle_heading_3: {
      title: "可摺疊三級標題",
      subtext: "可摺疊的小節和分組標題",
      aliases: ["h3", "heading3", "subheading", "標題", "三級標題", "摺疊"],
      group: "副標題",
    },
    quote: {
      title: "引用",
      subtext: "引用或摘錄",
      aliases: ["quotation", "blockquote", "bq"],
      group: "基本區塊",
    },
    numbered_list: {
      title: "有序列表",
      subtext: "用於顯示有序列表",
      aliases: [
        "ol",
        "li",
        "list",
        "numberedlist",
        "numbered list",
        "列表",
        "有序列表",
      ],
      group: "基礎",
    },
    bullet_list: {
      title: "無序列表",
      subtext: "用於顯示無序列表",
      aliases: [
        "ul",
        "li",
        "list",
        "bulletlist",
        "bullet list",
        "列表",
        "無序列表",
      ],
      group: "基礎",
    },
    check_list: {
      title: "檢查清單",
      subtext: "用於顯示帶有核取方塊的列表",
      aliases: [
        "ul",
        "li",
        "checklist",
        "checked list",
        "列表",
        "檢查清單",
        "勾選列表",
        "核取方塊",
      ],
      group: "基礎",
    },
    toggle_list: {
      title: "可摺疊列表",
      subtext: "帶有可隱藏子項的列表",
      aliases: ["li", "列表", "可摺疊列表", "摺疊列表"],
      group: "基礎",
    },
    paragraph: {
      title: "段落",
      subtext: "用於文件正文",
      aliases: ["p", "paragraph", "text", "正文"],
      group: "基礎",
    },
    code_block: {
      title: "程式碼區塊",
      subtext: "用於顯示帶有語法標記的程式碼區塊",
      aliases: ["code", "pre", "程式碼", "預格式"],
      group: "基礎",
    },
    page_break: {
      title: "分頁符",
      subtext: "頁面分隔符",
      aliases: ["page", "break", "separator", "分頁", "分隔符"],
      group: "基礎",
    },
    table: {
      title: "表格",
      subtext: "使用表格",
      aliases: ["table", "表格"],
      group: "進階功能",
    },
    image: {
      title: "圖片",
      subtext: "插入圖片",
      aliases: [
        "圖片",
        "上傳圖片",
        "上傳",
        "image",
        "img",
        "相簿",
        "媒體",
        "url",
      ],
      group: "媒體",
    },
    video: {
      title: "影片",
      subtext: "插入影片",
      aliases: [
        "影片",
        "影片上傳",
        "上傳",
        "video",
        "mp4",
        "電影",
        "媒體",
        "url",
        "雲端硬碟",
        "dropbox",
      ],
      group: "媒體",
    },
    audio: {
      title: "音訊",
      subtext: "插入音訊",
      aliases: [
        "音訊",
        "音訊上傳",
        "上傳",
        "audio",
        "mp3",
        "聲音",
        "媒體",
        "url",
        "雲端硬碟",
        "dropbox",
      ],
      group: "媒體",
    },
    file: {
      title: "檔案",
      subtext: "插入檔案",
      aliases: ["檔案", "上傳", "file", "嵌入", "媒體", "url"],
      group: "媒體",
    },
    emoji: {
      title: "表情符號",
      subtext: "用於插入表情符號",
      aliases: [
        "表情符號",
        "emoji",
        "face",
        "emote",
        "表情",
        "表情表達",
        "表情",
      ],
      group: "其他",
    },
    divider: {
      title: "分隔線",
      subtext: "分隔線區塊",
      aliases: ["divider", "hr", "horizontal rule"],
      group: "基礎區塊",
    },
  },
  placeholders: {
    default: "輸入 '/' 以使用指令",
    heading: "標題",
    toggleListItem: "切換",
    bulletListItem: "列表",
    numberedListItem: "列表",
    checkListItem: "列表",
    new_comment: "撰寫評論...",
    edit_comment: "編輯評論...",
    comment_reply: "新增評論...",
  },
  file_blocks: {
    add_button_text: {
      image: "新增圖片",
      video: "新增影片",
      audio: "新增音訊",
      file: "新增檔案",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "空的切換區。點擊新增區塊。",
  },
  // from react package:
  side_menu: {
    add_block_label: "新增區塊",
    drag_handle_label: "開啟選單",
  },
  drag_handle: {
    delete_menuitem: "刪除",
    colors_menuitem: "顏色",
    header_row_menuitem: "列標題",
    header_column_menuitem: "欄標題",
  },
  table_handle: {
    delete_column_menuitem: "刪除欄",
    delete_row_menuitem: "刪除列",
    add_left_menuitem: "左側新增欄",
    add_right_menuitem: "右側新增欄",
    add_above_menuitem: "上方新增列",
    add_below_menuitem: "下方新增列",
    split_cell_menuitem: "分割儲存格",
    merge_cells_menuitem: "合併儲存格",
    background_color_menuitem: "背景色",
  },
  suggestion_menu: {
    no_items_title: "無相符項目",
  },
  color_picker: {
    text_title: "文字",
    background_title: "背景色",
    colors: {
      default: "預設",
      gray: "灰色",
      brown: "棕色",
      red: "紅色",
      orange: "橙色",
      yellow: "黃色",
      green: "綠色",
      blue: "藍色",
      purple: "紫色",
      pink: "粉色",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "粗體",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "斜體",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "底線",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "刪除線",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "程式碼標記",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "顏色",
    },
    link: {
      tooltip: "新增連結",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "編輯標題",
      input_placeholder: "編輯標題",
    },
    file_replace: {
      tooltip: {
        image: "替換圖片",
        video: "替換影片",
        audio: "替換音訊",
        file: "替換檔案",
      },
    },
    file_rename: {
      tooltip: {
        image: "重新命名圖片",
        video: "重新命名影片",
        audio: "重新命名音訊",
        file: "重新命名檔案",
      },
      input_placeholder: {
        image: "重新命名圖片",
        video: "重新命名影片",
        audio: "重新命名音訊",
        file: "重新命名檔案",
      },
    },
    file_download: {
      tooltip: {
        image: "下載圖片",
        video: "下載影片",
        audio: "下載音訊",
        file: "下載檔案",
      },
    },
    file_delete: {
      tooltip: {
        image: "刪除圖片",
        video: "刪除影片",
        audio: "刪除音訊",
        file: "刪除檔案",
      },
    },
    file_preview_toggle: {
      tooltip: "切換預覽",
    },
    nest: {
      tooltip: "巢狀",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "取消巢狀",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "靠左對齊",
    },
    align_center: {
      tooltip: "置中",
    },
    align_right: {
      tooltip: "靠右對齊",
    },
    align_justify: {
      tooltip: "兩端對齊",
    },
    table_cell_merge: {
      tooltip: "合併儲存格",
    },
    comment: {
      tooltip: "新增評論",
    },
  },
  file_panel: {
    upload: {
      title: "上傳",
      file_placeholder: {
        image: "上傳圖片",
        video: "上傳影片",
        audio: "上傳音訊",
        file: "上傳檔案",
      },
      upload_error: "錯誤：上傳失敗",
    },
    embed: {
      title: "嵌入",
      embed_button: {
        image: "嵌入圖片",
        video: "嵌入影片",
        audio: "嵌入音訊",
        file: "嵌入檔案",
      },
      url_placeholder: "輸入圖片網址",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "清除連結",
    },
    edit: {
      text: "編輯連結",
      tooltip: "編輯",
    },
    open: {
      tooltip: "在新視窗開啟",
    },
    form: {
      title_placeholder: "編輯標題",
      url_placeholder: "編輯連結網址",
    },
  },
  comments: {
    edited: "已編輯",
    save_button_text: "儲存",
    cancel_button_text: "取消",
    actions: {
      add_reaction: "新增回應",
      resolve: "解決",
      edit_comment: "編輯評論",
      delete_comment: "刪除評論",
      more_actions: "更多操作",
    },
    reactions: {
      reacted_by: "已回應",
    },
    sidebar: {
      marked_as_resolved: "標記為已解決",
      more_replies: (count) => `還有 ${count} 則回覆`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
