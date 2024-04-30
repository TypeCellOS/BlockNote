import {
  BlockNoteViewRaw,
  ComponentsContext,
  ComponentsContextValue,
} from "@blocknote/react";
import { ComponentProps } from "react";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "./menu/Menu";
import "./style.css";
import { Toolbar, ToolbarButton, ToolbarSelect } from "./toolbar/Toolbar";

export const components: ComponentsContextValue = {
  Toolbar,
  ToolbarButton,
  ToolbarSelect,
  Menu,
  MenuTrigger,
  MenuDropdown,
  MenuLabel,
  MenuDivider,
  MenuItem,
  Popover: () => null,
  PopoverContent: () => null,
  PopoverTrigger: () => null,
  TextInput: () => null,
  Form: (props) => <div {...props} />,
  //   SuggestionMenuLoader: () => (
  //     <Loader className={"bn-slash-menu-loader"} type="dots" />
  //   ),
};

export const BlockNoteView = (
  props: ComponentProps<typeof BlockNoteViewRaw>
) => {
  console.log("render shad");
  return (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw {...props} />
    </ComponentsContext.Provider>
  );
};

/*

TODO:
- allow passing in shadcn components
- fix other libs
- select items
- menu colors
- caret
- suggestion menu?
- forms
- toggle buttons
- zindex
*/
