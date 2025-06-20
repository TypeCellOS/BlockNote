import {
  BlockNoteEditor,
  BlockSchema,
  getDefaultSlashMenuItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  RiCodeBlock,
  RiEmotionFill,
  RiFile2Line,
  RiFilmLine,
  RiH1,
  RiH2,
  RiH3,
  RiH4,
  RiH5,
  RiH6,
  RiImage2Fill,
  RiListCheck3,
  RiListOrdered,
  RiListUnordered,
  RiPlayList2Fill,
  RiQuoteText,
  RiTable2,
  RiText,
  RiVolumeUpFill,
} from "react-icons/ri";

import { IconType } from "react-icons";
import { DefaultReactSuggestionItem } from "./types.js";

const icons: Record<string, IconType> = {
  heading: RiH1,
  heading_2: RiH2,
  heading_3: RiH3,
  heading_4: RiH4,
  heading_5: RiH5,
  heading_6: RiH6,
  toggle_heading: RiH1,
  toggle_heading_2: RiH2,
  toggle_heading_3: RiH3,
  quote: RiQuoteText,
  toggle_list: RiPlayList2Fill,
  numbered_list: RiListOrdered,
  bullet_list: RiListUnordered,
  check_list: RiListCheck3,
  paragraph: RiText,
  table: RiTable2,
  image: RiImage2Fill,
  video: RiFilmLine,
  audio: RiVolumeUpFill,
  file: RiFile2Line,
  emoji: RiEmotionFill,
  code_block: RiCodeBlock,
};

export function getDefaultReactSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): DefaultReactSuggestionItem[] {
  return getDefaultSlashMenuItems(editor).map((item) => {
    const Icon = icons[item.key];
    return {
      ...item,
      icon: <Icon size={18} />,
    };
  });
}
