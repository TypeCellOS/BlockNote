import { HyperlinkToolbarProps, ToolbarButton } from "@blocknote/react";

// Custom Hyperlink Toolbar button to open a browser alert.
export function AlertButton(props: HyperlinkToolbarProps) {
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
