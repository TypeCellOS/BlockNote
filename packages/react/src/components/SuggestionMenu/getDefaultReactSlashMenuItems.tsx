import {
  BlockNoteEditor,
  BlockSchema,
  getDefaultSlashMenuItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  RiEmotionFill,
  RiH1,
  RiH2,
  RiH3,
  RiFile2Line,
  RiImage2Fill,
  RiListCheck3,
  RiListOrdered,
  RiListUnordered,
  RiTable2,
  RiText,
  RiFilmLine,
  RiVolumeUpFill,
} from "react-icons/ri";
import { DefaultReactSuggestionItem } from "./types";

const icons = {
  heading: RiH1,
  heading_2: RiH2,
  heading_3: RiH3,
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
};

export function getDefaultReactSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): DefaultReactSuggestionItem[] {
  return getDefaultSlashMenuItems(editor).map((item) => {
    const Icon = icons[item.key];
    return {
      ...item,
      icon: <Icon size={18} />,
    };
  });
}
