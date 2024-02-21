import { HyperlinkToolbarProps, ToolbarButton } from "@blocknote/react";

export function CustomButton(props: HyperlinkToolbarProps) {
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
