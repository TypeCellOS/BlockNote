import { RiLinkUnlink } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { LinkToolbarProps } from "../LinkToolbarProps.js";

export const DeleteLinkButton = (
  props: Pick<LinkToolbarProps, "deleteLink">,
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  return (
    <Components.LinkToolbar.Button
      className={"bn-button"}
      label={dict.link_toolbar.delete.tooltip}
      mainTooltip={dict.link_toolbar.delete.tooltip}
      isSelected={false}
      onClick={props.deleteLink}
      icon={<RiLinkUnlink />}
    />
  );
};
