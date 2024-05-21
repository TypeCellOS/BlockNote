import { Dictionary } from "../dictionary";

export const ja: Dictionary = {
  slash_menu: {
    heading: {
      title: "見出し１",
      subtext: "トップレベルの見出しに使用",
      aliases: ["h", "見出し１", "h1", "大見出し"],
      group: "見出し",
    },
    heading_2: {
      title: "見出し２",
      subtext: "重要なセクションに使用",
      aliases: ["h2", "見出し2", "subheading", "中見出し"],
      group: "見出し",
    },
    heading_3: {
      title: "見出し３",
      subtext: "セクションやグループの見出しに使用",
      aliases: ["h3", "見出し3", "subheading", "小見出し"],
      group: "見出し",
    },
    numbered_list: {
      title: "番号付リスト",
      subtext: "番号付リストを表示するために使用",
      aliases: [
        "ol",
        "li",
        "numberedlist",
        "numbered list",
        "リスト",
        "番号付リスト",
        "番号 リスト",
      ],
      group: "基本ブロック",
    },
    bullet_list: {
      title: "箇条書き",
      subtext: "箇条書きを表示するために使用",
      aliases: ["ul", "li", "リスト", "箇条書きリスト"],
      group: "基本ブロック",
    },
    paragraph: {
      title: "標準テキスト",
      subtext: "本文に使用",
      aliases: ["p", "paragraph", "標準テキスト"],
      group: "基本ブロック",
    },
    table: {
      title: "表",
      subtext: "表に使用",
      aliases: ["table", "表", "テーブル"],
      group: "高度なブロック",
    },
    image: {
      title: "画像",
      subtext: "画像を挿入",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
        "drive",
        "dropbox",
        "画像",
      ],
      group: "メディア",
    },
  },
  placeholders: {
    default: "テキストを入力するか'/' を入力してコマンド選択",
    heading: "見出し",
    bulletListItem: "リストを追加",
    numberedListItem: "リストを追加",
  },
  image: {
    add_button: "画像を追加",
  },
  // from react package:
  side_menu: {
    add_block_label: "ブロックを追加",
    drag_handle_label: "ブロックメニュー",
  },
  drag_handle: {
    delete_menuitem: "削除",
    colors_menuitem: "色を変更",
  },
  table_handle: {
    delete_column_menuitem: "列を削除",
    delete_row_menuitem: "行を削除",
    add_left_menuitem: "左に列を追加",
    add_right_menuitem: "右に列を追加",
    add_above_menuitem: "上に行を追加",
    add_below_menuitem: "下に行を追加",
  },
  suggestion_menu: {
    no_items_title: "アイテムが見つかりません",
    loading: "読込中…",
  },
  color_picker: {
    text_title: "文字色",
    background_title: "背景色",
    colors: {
      default: "デフォルト",
      gray: "グレー",
      brown: "茶色",
      red: "赤",
      orange: "オレンジ",
      yellow: "黄色",
      green: "緑",
      blue: "青",
      purple: "紫",
      pink: "ピンク",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "太字",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "斜体",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "下線",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "打ち消し",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "コード",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "色",
    },
    link: {
      tooltip: "リンク",
      secondary_tooltip: "Mod+K",
    },
    image_caption: {
      tooltip: "キャプションを編集",
      input_placeholder: "キャプションを編集",
    },
    image_replace: {
      tooltip: "画像の置き換え",
    },
    nest: {
      tooltip: "インデント増",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "インデント減",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "左揃え",
    },
    align_center: {
      tooltip: "中央揃え",
    },
    align_right: {
      tooltip: "右揃え",
    },
    align_justify: {
      tooltip: "両端揃え",
    },
  },
  image_panel: {
    upload: {
      title: "アップロード",
      file_placeholder: "画像アップロード",
      upload_error: "エラー: アップロードが失敗しました",
    },
    embed: {
      title: "埋め込み",
      embed_button: "画像を埋め込み",
      url_placeholder: "URLを入力",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "リンクを解除",
    },
    edit: {
      text: "リンクを編集",
      tooltip: "編集",
    },
    open: {
      tooltip: "新しいタブでリンクを開く",
    },
    form: {
      title_placeholder: "タイトルを編集",
      url_placeholder: "URLを編集",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
