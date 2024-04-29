import { createContext, useContext } from "react";

// function scramble(dict: any) {
//   const newDict: any = {} as any;

//   for (const key in dict) {
//     if (typeof dict[key] === "object") {
//       newDict[key] = scramble(dict[key]);
//     } else {
//       newDict[key] = dict[key].split("").reverse().join("");
//     }
//   }

//   return newDict;
// }

export const english = {
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
      secondary_tooltip: "Mod+Shift+X",
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
    image_caption: {
      tooltip: "Edit caption",
      input_placeholder: "Edit caption",
    },
    image_replace: {
      tooltip: "Replace image",
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
  image_panel: {
    upload: {
      title: "Upload",
      file_placeholder: "Upload image",
      upload_error: "Error: Upload failed",
    },
    embed: {
      title: "Embed",
      embed_button: "Embed image",
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

type Dictionary = typeof english;

export const DictionaryContext = createContext<Dictionary | undefined>(
  undefined
);

export function useDictionaryContext(): Dictionary {
  return useContext(DictionaryContext)!;
}
