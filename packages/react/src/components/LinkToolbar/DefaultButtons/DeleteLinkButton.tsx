import { RiLinkUnlink } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { usePlugin } from "../../../hooks/usePlugin.js";
import { LinkToolbar } from "@blocknote/core";

export const DeleteLinkButton = () => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { deleteLink } = usePlugin(LinkToolbar);

  return (
    <Components.LinkToolbar.Button
      className={"bn-button"}
      label={dict.link_toolbar.delete.tooltip}
      mainTooltip={dict.link_toolbar.delete.tooltip}
      isSelected={false}
      onClick={deleteLink}
      icon={<RiLinkUnlink />}
    />
  );
};
