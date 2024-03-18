import { LinkToolbarProps, ToolbarButton } from "@blocknote/react";

// Custom Link Toolbar button to open a browser alert.
export function AlertButton(props: LinkToolbarProps) {
  return (
    <ToolbarButton
      mainTooltip={"Open Alert with URL"}
      onClick={() => {
        window.alert(`Link URL: ${props.url}`);
      }}>
      Open Alert
    </ToolbarButton>
  );
}
