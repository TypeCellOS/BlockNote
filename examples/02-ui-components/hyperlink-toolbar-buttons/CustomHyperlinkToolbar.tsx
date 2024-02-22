import { HyperlinkToolbar, HyperlinkToolbarProps } from "@blocknote/react";

import { CustomButton } from "./CustomButton";

export function CustomHyperlinkToolbar(props: HyperlinkToolbarProps) {
  // TODO: We don't export the default buttons atm. Also, the edit button
  //  replaces the entire toolbar component when editing, which seems like a
  //  massive pain when you want to customize the hyperlink. Lots of
  //  refactoring probably needed here.
  return (
    <HyperlinkToolbar {...props}>
      <CustomButton {...props} />
    </HyperlinkToolbar>
  );
}
