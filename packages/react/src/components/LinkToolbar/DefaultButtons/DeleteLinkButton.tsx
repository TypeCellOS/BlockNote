import { RiLinkUnlink } from "react-icons/ri";

import { LinkToolbarProps } from "../LinkToolbarProps";
import { useComponentsContext } from "../../../editor/ComponentsContext";

export const DeleteLinkButton = (
  props: Pick<LinkToolbarProps, "deleteLink">
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.LinkToolbar.Button
      className={"bn-delete-link-button"}
      mainTooltip="Remove link"
      isSelected={false}
      onClick={props.deleteLink}
      icon={<RiLinkUnlink />}
    />
  );
};
