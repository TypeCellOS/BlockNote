import { RiExternalLinkFill } from "react-icons/ri";
import { LinkToolbarProps } from "../LinkToolbarProps";
import { useComponentsContext } from "../../../editor/ComponentsContext";

export const OpenLinkButton = (props: Pick<LinkToolbarProps, "url">) => {
  const Components = useComponentsContext()!;

  return (
    <Components.LinkToolbar.Button
      className={"bn-open-link-button"}
      mainTooltip="Open in new tab"
      isSelected={false}
      onClick={() => {
        window.open(props.url, "_blank");
      }}
      icon={<RiExternalLinkFill />}
    />
  );
};
