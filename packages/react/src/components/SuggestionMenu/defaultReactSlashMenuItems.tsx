import { getDefaultSlashMenuItems } from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiImage2Fill,
  RiListOrdered,
  RiListUnordered,
  RiTable2,
  RiText,
} from "react-icons/ri";

const icons = {
  "Heading 1": RiH1,
  "Heading 2": RiH2,
  "Heading 3": RiH3,
  "Numbered List": RiListOrdered,
  "Bullet List": RiListUnordered,
  Paragraph: RiText,
  Table: RiTable2,
  Image: RiImage2Fill,
};

export function getDefaultReactSlashMenuItems() {
  return getDefaultSlashMenuItems().map((item) => {
    const Icon = icons[item.title];
    return {
      ...item,
      icon: <Icon size={18} />,
    };
  });
}
