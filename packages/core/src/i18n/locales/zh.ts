import type { Dictionary } from "../dictionary";

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
    paragraph: {
      title: "段落",
      subtext: "用于文档正文",
      aliases: ["p", "paragraph", "text", "正文"],
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
  },
  placeholders: {
    default: "输入 '/' 以使用命令",
    heading: "标题",
    bulletListItem: "列表",
    numberedListItem: "列表",
  },
  image: {
    add_button: "添加图片",
  },
  // from react package:
  side_menu: {
    add_block_label: "添加块",
    drag_handle_label: "打开菜单",
  },
  drag_handle: {
    delete_menuitem: "删除",
    colors_menuitem: "颜色",
  },
  table_handle: {
    delete_column_menuitem: "删除列",
    delete_row_menuitem: "删除行",
    add_left_menuitem: "左侧添加列",
    add_right_menuitem: "右侧添加列",
    add_above_menuitem: "上方添加行",
    add_below_menuitem: "下方添加行",
  },
  suggestion_menu: {
    no_items_title: "无匹配项",
    loading: "加载中…",
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
    image_caption: {
      tooltip: "编辑标题",
      input_placeholder: "编辑标题",
    },
    image_replace: {
      tooltip: "替换图片",
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
  },
  image_panel: {
    upload: {
      title: "上传",
      file_placeholder: "上传图片",
      upload_error: "Error：上传失败",
    },
    embed: {
      title: "嵌入",
      embed_button: "嵌入图片",
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
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
