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
    heading_4: {
      title: "Heading 4",
      subtext: "Minor subsection heading",
      aliases: ["h4", "heading4", "subheading4"],
      group: "Subheadings",
    },
    heading_5: {
      title: "Heading 5",
      subtext: "Small subsection heading",
      aliases: ["h5", "heading5", "subheading5"],
      group: "Subheadings",
    },
    heading_6: {
      title: "Heading 6",
      subtext: "Lowest-level heading",
      aliases: ["h6", "heading6", "subheading6"],
      group: "Subheadings",
    },
    toggle_heading: {
      title: "Toggle Heading 1",
      subtext: "Toggleable top-level heading",
      aliases: ["h", "heading1", "h1", "collapsable"],
      group: "Subheadings",
    },
    toggle_heading_2: {
      title: "Toggle Heading 2",
      subtext: "Toggleable key section heading",
      aliases: ["h2", "heading2", "subheading", "collapsable"],
      group: "Subheadings",
    },
    toggle_heading_3: {
      title: "Toggle Heading 3",
      subtext: "Toggleable subsection and group heading",
      aliases: ["h3", "heading3", "subheading", "collapsable"],
      group: "Subheadings",
    },
    quote: {
      title: "Quote",
      subtext: "Quote or excerpt",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Basic blocks",
    },
    toggle_list: {
      title: "Toggle List",
      subtext: "List with hideable sub-items",
      aliases: ["li", "list", "toggleList", "toggle list", "collapsable list"],
      group: "Basic blocks",
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
    code_block: {
      title: "Code Block",
      subtext: "Code block with syntax highlighting",
      aliases: ["code", "pre"],
      group: "Basic blocks",
    },
    page_break: {
      title: "Page Break",
      subtext: "Page separator",
      aliases: ["page", "break", "separator"],
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
    toggleListItem: "Toggle",
    bulletListItem: "List",
    numberedListItem: "List",
    checkListItem: "List",
    emptyDocument: undefined,
    new_comment: "Write a comment...",
    edit_comment: "Edit comment...",
    comment_reply: "Add comment...",
  } as Record<string | "default" | "emptyDocument", string | undefined>,
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
    header_row_menuitem: "Header row",
    header_column_menuitem: "Header column",
  },
  table_handle: {
    delete_column_menuitem: "Delete column",
    delete_row_menuitem: "Delete row",
    add_left_menuitem: "Add column left",
    add_right_menuitem: "Add column right",
    add_above_menuitem: "Add row above",
    add_below_menuitem: "Add row below",
    split_cell_menuitem: "Split cell",
    merge_cells_menuitem: "Merge cells",
    background_color_menuitem: "Background color",
  },
  suggestion_menu: {
    no_items_title: "No items found",
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
    table_cell_merge: {
      tooltip: "Merge cells",
    },
    comment: {
      tooltip: "Add comment",
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
  comments: {
    edited: "edited",
    save_button_text: "Save",
    cancel_button_text: "Cancel",
    actions: {
      add_reaction: "Add reaction",
      resolve: "Resolve",
      edit_comment: "Edit comment",
      delete_comment: "Delete comment",
      more_actions: "More actions",
    },
    reactions: {
      reacted_by: "Reacted by",
    },
    sidebar: {
      marked_as_resolved: "Marked as resolved",
      more_replies: (count: number) => `${count} more replies`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
