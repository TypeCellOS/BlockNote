import { RiExternalLinkFill } from "react-icons/ri";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useDictionaryContext } from "../../../i18n/dictionary";
import { LinkToolbarProps } from "../LinkToolbarProps";

export const OpenLinkButton = (props: Pick<LinkToolbarProps, "url">) => {
  const Components = useComponentsContext()!;
  const dict = useDictionaryContext();

  return (
    <Components.LinkToolbar.Button
      className={"bn-button"}
      mainTooltip={dict.link_toolbar.open.tooltip}
      isSelected={false}
      onClick={() => {
        window.open(props.url, "_blank");
      }}
      icon={<RiExternalLinkFill />}
    />
  );
};
