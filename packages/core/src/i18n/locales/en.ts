export const en = {
  slash_menu: {
    heading: {
      title: "Heading 1",
      subtext: "Top-level heading",
      aliases: ["h", "heading1", "h1"],
      group: "Headings",
    },
    heading_2: {
      title: "Heading 2",
      subtext: "Key section heading",
      aliases: ["h2", "heading2", "subheading"],
      group: "Headings",
    },
    heading_3: {
      title: "Heading 3",
      subtext: "Subsection and group heading",
      aliases: ["h3", "heading3", "subheading"],
      group: "Headings",
    },
    numbered_list: {
      title: "Numbered List",
      subtext: "List with ordered items",
      aliases: ["ol", "li", "list", "numberedlist", "numbered list"],
      group: "Basic blocks",
    },
    bullet_list: {
      title: "Bullet List",
      subtext: "List with unordered items",
      aliases: ["ul", "li", "list", "bulletlist", "bullet list"],
      group: "Basic blocks",
    },
    check_list: {
      title: "Check List",
      subtext: "List with checkboxes",
      aliases: [
        "ul",
        "li",
        "list",
        "checklist",
        "check list",
        "checked list",
        "checkbox",
      ],
      group: "Basic blocks",
    },
    paragraph: {
      title: "Paragraph",
      subtext: "The body of your document",
      aliases: ["p", "paragraph"],
      group: "Basic blocks",
    },
    table: {
      title: "Table",
      subtext: "Table with editable cells",
      aliases: ["table"],
      group: "Advanced",
    },
    image: {
      title: "Image",
      subtext: "Resizable image with caption",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
      ],
      group: "Media",
    },
    video: {
      title: "Video",
      subtext: "Resizable video with caption",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "url",
      ],
      group: "Media",
    },
    audio: {
      title: "Audio",
      subtext: "Embedded audio with caption",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "url",
      ],
      group: "Media",
    },
    file: {
      title: "File",
      subtext: "Embedded file",
      aliases: ["file", "upload", "embed", "media", "url"],
      group: "Media",
    },
    emoji: {
      title: "Emoji",
      subtext: "Search for and insert an emoji",
      aliases: ["emoji", "emote", "emotion", "face"],
      group: "Others",
    },
  },
  placeholders: {
    default: "Enter text or type '/' for commands",
    heading: "Heading",
    bulletListItem: "List",
    numberedListItem: "List",
    checkListItem: "List",
  },
  file_blocks: {
    image: {
      add_button_text: "Add image",
    },
    video: {
      add_button_text: "Add video",
    },
    audio: {
      add_button_text: "Add audio",
    },
    file: {
      add_button_text: "Add file",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "Add block",
    drag_handle_label: "Open block menu",
  },
  drag_handle: {
    delete_menuitem: "Delete",
    colors_menuitem: "Colors",
  },
  table_handle: {
    delete_column_menuitem: "Delete column",
    delete_row_menuitem: "Delete row",
    add_left_menuitem: "Add column left",
    add_right_menuitem: "Add column right",
    add_above_menuitem: "Add row above",
    add_below_menuitem: "Add row below",
  },
  suggestion_menu: {
    no_items_title: "No items found",
    loading: "Loading…",
  },
  color_picker: {
    text_title: "Text",
    background_title: "Background",
    colors: {
      default: "Default",
      gray: "Gray",
      brown: "Brown",
      red: "Red",
      orange: "Orange",
      yellow: "Yellow",
      green: "Green",
      blue: "Blue",
      purple: "Purple",
      pink: "Pink",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "Bold",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "Italic",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Underline",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Strike",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Code",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Colors",
    },
    link: {
      tooltip: "Create link",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Edit caption",
      input_placeholder: "Edit caption",
    },
    file_replace: {
      tooltip: {
        image: "Replace image",
        video: "Replace video",
        audio: "Replace audio",
        file: "Replace file",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "Rename image",
        video: "Rename video",
        audio: "Rename audio",
        file: "Rename file",
      } as Record<string, string>,
      input_placeholder: {
        image: "Rename image",
        video: "Rename video",
        audio: "Rename audio",
        file: "Rename file",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "Download image",
        video: "Download video",
        audio: "Download audio",
        file: "Download file",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "Delete image",
        video: "Delete video",
        audio: "Delete audio",
        file: "Delete file",
      } as Record<string, string>,
    },
    file_preview_toggle: {
      tooltip: "Toggle preview",
    },
    nest: {
      tooltip: "Nest block",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Unnest block",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Align text left",
    },
    align_center: {
      tooltip: "Align text center",
    },
    align_right: {
      tooltip: "Align text right",
    },
    align_justify: {
      tooltip: "Justify text",
    },
  },
  file_panel: {
    upload: {
      title: "Upload",
      file_placeholder: {
        image: "Upload image",
        video: "Upload video",
        audio: "Upload audio",
        file: "Upload file",
      } as Record<string, string>,
      upload_error: "Error: Upload failed",
    },
    embed: {
      title: "Embed",
      embed_button: {
        image: "Embed image",
        video: "Embed video",
        audio: "Embed audio",
        file: "Embed file",
      } as Record<string, string>,
      url_placeholder: "Enter URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Remove link",
    },
    edit: {
      text: "Edit link",
      tooltip: "Edit",
    },
    open: {
      tooltip: "Open in new tab",
    },
    form: {
      title_placeholder: "Edit title",
      url_placeholder: "Edit URL",
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
