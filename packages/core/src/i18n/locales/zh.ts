import type { Dictionary } from "../dictionary.js";

export const zh: Dictionary = {
  slash_menu: {
    heading: {
      title: "一级标题",
      subtext: "用于顶级标题",
      aliases: ["h", "heading1", "h1", "标题", "一级标题"],
      group: "标题",
    },
    heading_2: {
      title: "二级标题",
      subtext: "用于关键部分",
      aliases: ["h2", "heading2", "subheading", "标题", "二级标题", "副标题"],
      group: "标题",
    },
    heading_3: {
      title: "三级标题",
      subtext: "用于小节和分组标题",
      aliases: ["h3", "heading3", "subheading", "标题", "三级标题"],
      group: "标题",
    },
    heading_4: {
      title: "四级标题",
      subtext: "用于较小的子节标题",
      aliases: ["h4", "heading4", "subheading4", "四级标题"],
      group: "副标题",
    },
    heading_5: {
      title: "五级标题",
      subtext: "用于较小的子节标题",
      aliases: ["h5", "heading5", "subheading5", "五级标题"],
      group: "副标题",
    },
    heading_6: {
      title: "六级标题",
      subtext: "用于最低层级的标题",
      aliases: ["h6", "heading6", "subheading6", "六级标题"],
      group: "副标题",
    },
    toggle_heading: {
      title: "可折叠一级标题",
      subtext: "可折叠的顶级标题",
      aliases: ["h", "heading1", "h1", "标题", "一级标题", "折叠"],
      group: "副标题",
    },
    toggle_heading_2: {
      title: "可折叠二级标题",
      subtext: "可折叠的关键部分标题",
      aliases: [
        "h2",
        "heading2",
        "subheading",
        "标题",
        "二级标题",
        "副标题",
        "折叠",
      ],
      group: "副标题",
    },
    toggle_heading_3: {
      title: "可折叠三级标题",
      subtext: "可折叠的小节和分组标题",
      aliases: ["h3", "heading3", "subheading", "标题", "三级标题", "折叠"],
      group: "副标题",
    },
    quote: {
      title: "引用",
      subtext: "引用或摘录",
      aliases: ["quotation", "blockquote", "bq"],
      group: "基本块",
    },
    numbered_list: {
      title: "有序列表",
      subtext: "用于显示有序列表",
      aliases: [
        "ol",
        "li",
        "list",
        "numberedlist",
        "numbered list",
        "列表",
        "有序列表",
      ],
      group: "基础",
    },
    bullet_list: {
      title: "无序列表",
      subtext: "用于显示无序列表",
      aliases: [
        "ul",
        "li",
        "list",
        "bulletlist",
        "bullet list",
        "列表",
        "无序列表",
      ],
      group: "基础",
    },
    check_list: {
      title: "检查清单",
      subtext: "用于显示带有复选框的列表",
      aliases: [
        "ul",
        "li",
        "checklist",
        "checked list",
        "列表",
        "检查清单",
        "勾选列表",
        "复选框",
      ],
      group: "基础",
    },
    toggle_list: {
      title: "可折叠列表",
      subtext: "带有可隐藏子项的列表",
      aliases: ["li", "列表", "可折叠列表", "折叠列表"],
      group: "基础",
    },
    paragraph: {
      title: "段落",
      subtext: "用于文档正文",
      aliases: ["p", "paragraph", "text", "正文"],
      group: "基础",
    },
    code_block: {
      title: "代码块",
      subtext: "用于显示带有语法高亮的代码块",
      aliases: ["code", "pre", "代码", "预格式"],
      group: "基础",
    },
    page_break: {
      title: "分页符",
      subtext: "页面分隔符",
      aliases: ["page", "break", "separator", "分页", "分隔符"],
      group: "基础",
    },
    table: {
      title: "表格",
      subtext: "使用表格",
      aliases: ["table", "表格"],
      group: "高级功能",
    },
    image: {
      title: "图片",
      subtext: "插入图片",
      aliases: [
        "图片",
        "上传图片",
        "上传",
        "image",
        "img",
        "相册",
        "媒体",
        "url",
      ],
      group: "媒体",
    },
    video: {
      title: "视频",
      subtext: "插入视频",
      aliases: [
        "视频",
        "视频上传",
        "上传",
        "video",
        "mp4",
        "电影",
        "媒体",
        "url",
        "驱动",
        "dropbox",
      ],
      group: "媒体",
    },
    audio: {
      title: "音频",
      subtext: "插入音频",
      aliases: [
        "音频",
        "音频上传",
        "上传",
        "audio",
        "mp3",
        "声音",
        "媒体",
        "url",
        "驱动",
        "dropbox",
      ],
      group: "媒体",
    },
    file: {
      title: "文件",
      subtext: "插入文件",
      aliases: ["文件", "上传", "file", "嵌入", "媒体", "url"],
      group: "媒体",
    },
    emoji: {
      title: "表情符号",
      subtext: "用于插入表情符号",
      aliases: [
        "表情符号",
        "emoji",
        "face",
        "emote",
        "表情",
        "表情表达",
        "表情",
      ],
      group: "其他",
    },
  },
  placeholders: {
    default: "输入 '/' 以使用命令",
    heading: "标题",
    toggleListItem: "切换",
    bulletListItem: "列表",
    numberedListItem: "列表",
    checkListItem: "列表",
    new_comment: "写评论...",
    edit_comment: "编辑评论...",
    comment_reply: "添加评论...",
  },
  file_blocks: {
    image: {
      add_button_text: "添加图片",
    },
    video: {
      add_button_text: "添加视频",
    },
    audio: {
      add_button_text: "添加音频",
    },
    file: {
      add_button_text: "添加文件",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "添加块",
    drag_handle_label: "打开菜单",
  },
  drag_handle: {
    delete_menuitem: "删除",
    colors_menuitem: "颜色",
    header_row_menuitem: "行标题",
    header_column_menuitem: "列标题",
  },
  table_handle: {
    delete_column_menuitem: "删除列",
    delete_row_menuitem: "删除行",
    add_left_menuitem: "左侧添加列",
    add_right_menuitem: "右侧添加列",
    add_above_menuitem: "上方添加行",
    add_below_menuitem: "下方添加行",
    split_cell_menuitem: "拆分单元格",
    merge_cells_menuitem: "合并单元格",
    background_color_menuitem: "背景色",
  },
  suggestion_menu: {
    no_items_title: "无匹配项",
  },
  color_picker: {
    text_title: "文本",
    background_title: "背景色",
    colors: {
      default: "默认",
      gray: "灰色",
      brown: "棕色",
      red: "红色",
      orange: "橙色",
      yellow: "黄色",
      green: "绿色",
      blue: "蓝色",
      purple: "紫色",
      pink: "粉色",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "加粗",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "斜体",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "下划线",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "删除线",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "代码标记",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "颜色",
    },
    link: {
      tooltip: "添加链接",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "编辑标题",
      input_placeholder: "编辑标题",
    },
    file_replace: {
      tooltip: {
        image: "替换图片",
        video: "替换视频",
        audio: "替换音频",
        file: "替换文件",
      },
    },
    file_rename: {
      tooltip: {
        image: "重命名图片",
        video: "重命名视频",
        audio: "重命名音频",
        file: "重命名文件",
      },
      input_placeholder: {
        image: "重命名图片",
        video: "重命名视频",
        audio: "重命名音频",
        file: "重命名文件",
      },
    },
    file_download: {
      tooltip: {
        image: "下载图片",
        video: "下载视频",
        audio: "下载音频",
        file: "下载文件",
      },
    },
    file_delete: {
      tooltip: {
        image: "删除图片",
        video: "删除视频",
        audio: "删除音频",
        file: "删除文件",
      },
    },
    file_preview_toggle: {
      tooltip: "切换预览",
    },
    nest: {
      tooltip: "嵌套",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "取消嵌套",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "左对齐",
    },
    align_center: {
      tooltip: "居中",
    },
    align_right: {
      tooltip: "右对齐",
    },
    align_justify: {
      tooltip: "文本对齐",
    },
    table_cell_merge: {
      tooltip: "合并单元格",
    },
    comment: {
      tooltip: "添加评论",
    },
  },
  file_panel: {
    upload: {
      title: "上传",
      file_placeholder: {
        image: "上传图片",
        video: "上传视频",
        audio: "上传音频",
        file: "上传文件",
      },
      upload_error: "Error：上传失败",
    },
    embed: {
      title: "嵌入",
      embed_button: {
        image: "嵌入图片",
        video: "嵌入视频",
        audio: "嵌入音频",
        file: "嵌入文件",
      },
      url_placeholder: "输入图片地址",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "清除链接",
    },
    edit: {
      text: "编辑链接",
      tooltip: "编辑",
    },
    open: {
      tooltip: "新窗口打开",
    },
    form: {
      title_placeholder: "编辑标题",
      url_placeholder: "编辑链接地址",
    },
  },
  comments: {
    edited: "已编辑",
    save_button_text: "保存",
    cancel_button_text: "取消",
    actions: {
      add_reaction: "添加反应",
      resolve: "解决",
      edit_comment: "编辑评论",
      delete_comment: "删除评论",
      more_actions: "更多操作",
    },
    reactions: {
      reacted_by: "已回应",
    },
    sidebar: {
      marked_as_resolved: "标记为已解决",
      more_replies: (count) => `还有 ${count} 条回复`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
