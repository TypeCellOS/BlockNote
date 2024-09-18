import { RiExternalLinkFill } from "react-icons/ri";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useDictionary } from "../../../i18n/dictionary";
import { LinkToolbarProps } from "../LinkToolbarProps";
import { sanitizeUrl } from "../../../util/sanitizeUrl";

export const OpenLinkButton = (props: Pick<LinkToolbarProps, "url">) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  return (
    <Components.LinkToolbar.Button
      className={"bn-button"}
      mainTooltip={dict.link_toolbar.open.tooltip}
      label={dict.link_toolbar.open.tooltip}
      isSelected={false}
      onClick={() => {
        window.open(sanitizeUrl(props.url, window.location.href), "_blank");
      }}
      icon={<RiExternalLinkFill />}
    />
  );
};
