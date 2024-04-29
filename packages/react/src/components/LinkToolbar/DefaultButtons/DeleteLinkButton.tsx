import { RiLinkUnlink } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useDictionaryContext } from "../../../i18n/dictionary";
import { LinkToolbarProps } from "../LinkToolbarProps";

export const DeleteLinkButton = (
  props: Pick<LinkToolbarProps, "deleteLink">
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionaryContext();
  return (
    <Components.LinkToolbar.Button
      className={"bn-button"}
      mainTooltip={dict.link_toolbar.delete.tooltip}
      isSelected={false}
      onClick={props.deleteLink}
      icon={<RiLinkUnlink />}
    />
  );
};
