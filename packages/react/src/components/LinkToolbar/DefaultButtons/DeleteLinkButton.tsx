import { LinkToolbarExtension } from "@blocknote/core/extensions";
import { RiLinkUnlink } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { useExtension } from "../../../hooks/useExtension.js";
import { LinkToolbarProps } from "../LinkToolbarProps.js";

export const DeleteLinkButton = (
  props: Pick<LinkToolbarProps, "range" | "setToolbarOpen">,
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { deleteLink } = useExtension(LinkToolbarExtension);

  return (
    <Components.LinkToolbar.Button
      className={"bn-button"}
      label={dict.link_toolbar.delete.tooltip}
      mainTooltip={dict.link_toolbar.delete.tooltip}
      isSelected={false}
      onClick={() => {
        deleteLink(props.range.from);
        props.setToolbarOpen?.(false);
      }}
      icon={<RiLinkUnlink />}
    />
  );
};
