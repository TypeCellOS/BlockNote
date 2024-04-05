import { RiExternalLinkFill } from "react-icons/ri";
import { LinkToolbarProps } from "../LinkToolbarProps";
import { useComponentsContext } from "../../../editor/ComponentsContext";

export const OpenLinkButton = (props: Pick<LinkToolbarProps, "url">) => {
  const components = useComponentsContext()!;

  return (
    <components.ToolbarButton
      mainTooltip="Open in new tab"
      isSelected={false}
      onClick={() => {
        window.open(props.url, "_blank");
      }}
      icon={<RiExternalLinkFill />}
    />
  );
};
