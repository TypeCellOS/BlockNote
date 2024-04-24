import {
  ChangeEvent,
  ComponentType,
  createContext,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
  useContext,
} from "react";
import { DefaultReactSuggestionItem } from "../components/SuggestionMenu/types";

// export type FormProps = {
//   children?: ReactNode;
// };
//
// export type MenuProps = {
//   children?: ReactNode;
//   onOpenChange?: (open: boolean) => void;
//   position?: "top" | "right" | "bottom" | "left";
//   sub?: boolean;
// };
//
// export type MenuDividerProps = Record<string, never>;
//
// export type MenuDropdownProps = {
//   className?: string;
//   sub?: boolean;
//   children?: ReactNode;
// };
//
// export type MenuItemProps = {
//   icon?: ReactNode;
//   checked?: boolean;
//   subTrigger?: boolean;
//   onClick?: () => void;
//   children?: ReactNode;
// };
//
// export type MenuLabelProps = {
//   children?: ReactNode;
// };
//
// export type MenuTriggerProps = {
//   sub?: boolean;
//   children?: ReactNode;
// };
//
// export type PanelProps = {
//   defaultOpenTab: string;
//   openTab: string;
//   setOpenTab: (name: string) => void;
//   tabs: {
//     name: string;
//     tabPanel: ReactNode;
//   }[];
//   loading: boolean;
//   setLoading: (loading: boolean) => void;
// };
//
// export type PanelButtonProps = {
//   className: string;
//   onClick: () => void;
//   children?: ReactNode;
// };
//
// export type PanelFileInputProps = {
//   placeholder?: string;
//   value?: File | null;
//   onChange?: (payload: File | null) => void;
// };
//
// export type PanelTabProps = {
//   children?: ReactNode;
// };
//
// export type PanelTextInputProps = {
//   placeholder: string;
//   value: string;
//   onChange: (event: ChangeEvent<HTMLInputElement>) => void;
//   onKeyDown: (event: KeyboardEvent) => void;
// };
//
// export type PopoverProps = {
//   opened?: boolean;
//   position?: "top" | "right" | "bottom" | "left";
//   children?: ReactNode;
// };
//
// export type PopoverTriggerProps = {
//   children?: ReactNode;
// };
//
// export type PopoverContentProps = {
//   children?: ReactNode;
// };
//
// export type SuggestionMenuEmptyItemProps = {
//   children?: ReactNode;
// };
//
// export type SuggestionMenuItemProps = {
//   title: string;
//   subtext?: string;
//   icon?: ReactNode;
//   badge?: ReactNode;
//   onClick?: () => void;
//   isSelected?: boolean;
//   setSelected?: (selected: boolean) => void;
// };
//
// export type SuggestionMenuLabelProps = {
//   children?: ReactNode;
// };
//
// export type TextInputProps = {
//   name: string;
//   label?: string;
//   icon?: ReactNode;
//   autoFocus?: boolean;
//   placeholder?: string;
//   value?: string;
//   onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
//   onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
//   onSubmit?: () => void;
// };
//
// export type ToolbarProps = {
//   onMouseEnter?: () => void;
//   onMouseLeave?: () => void;
//   children?: ReactNode;
// };
//
// export type ToolbarButtonProps = {
//   onClick?: (e: MouseEvent) => void;
//   icon?: ReactNode;
//   mainTooltip: string;
//   secondaryTooltip?: string;
//   isSelected?: boolean;
//   children?: any;
//   isDisabled?: boolean;
// };
//
// export type ToolbarSelectItem = {
//   text: string;
//   icon?: ReactNode;
//   onClick?: () => void;
//   isSelected?: boolean;
//   isDisabled?: boolean;
// };
//
// export type ToolbarSelectProps = {
//   items: ToolbarSelectItem[];
//   isDisabled?: boolean;
// };
//
// export type ComponentPropsWithoutClassNames = {
//   // TODO: No className
//   Form: FormProps;
//
//   // TODO: No className
//   Menu: MenuProps;
//   MenuTrigger: MenuTriggerProps;
//   MenuDropdown: MenuDropdownProps;
//   MenuDivider: MenuDividerProps;
//   MenuLabel: MenuLabelProps;
//   MenuItem: MenuItemProps;
//
//   Panel: PanelProps;
//   PanelButton: PanelButtonProps;
//   PanelFileInput: PanelFileInputProps;
//   PanelTab: PanelTabProps;
//   PanelTextInput: PanelTextInputProps;
//
//   // TODO: No className
//   Popover: PopoverProps;
//   PopoverTrigger: PopoverTriggerProps;
//   PopoverContent: PopoverContentProps;
//
//   SuggestionMenuLabel: SuggestionMenuLabelProps;
//   SuggestionMenuLoader: Record<string, never>;
//   SuggestionMenuItem: SuggestionMenuItemProps;
//   SuggestionMenuEmptyItem: SuggestionMenuEmptyItemProps;
//
//   TextInput: TextInputProps;
//
//   Toolbar: ToolbarProps;
//   ToolbarSelect: ToolbarSelectProps;
//   ToolbarButton: ToolbarButtonProps;
// };

export type ComponentProps = {
  FormattingToolbar: {
    Root: {
      className?: string;
      children?: ReactNode;
    };
    Button: {
      className?: string;
      children?: ReactNode;
      ref?: Ref<HTMLButtonElement>;
      mainTooltip: string;
      secondaryTooltip?: string;
      icon?: ReactNode;
      onClick?: (e: MouseEvent) => void;
      isSelected?: boolean;
      isDisabled?: boolean;
    };
    Select: {
      className?: string;
      items: {
        text: string;
        icon: ReactNode;
        onClick: () => void;
        isSelected: boolean;
        isDisabled?: boolean;
      }[];
      isDisabled?: boolean;
    };
  };
  ImagePanel: {
    Root: {
      className?: string;
      tabs: {
        name: string;
        tabPanel: ReactNode;
      }[];
      openTab: string;
      setOpenTab: (name: string) => void;
      defaultOpenTab: string;
      loading: boolean;
      setLoading: (loading: boolean) => void;
    };
    Button: {
      className?: string;
      children?: ReactNode;
      onClick: () => void;
    };
    FileInput: {
      className?: string;
      value: File | null;
      placeholder: string;
      onChange: (payload: File | null) => void;
    };
    TabPanel: {
      className?: string;
      children?: ReactNode;
    };
    TextInput: {
      className?: string;
      value: string;
      placeholder: string;
      onChange: (event: ChangeEvent<HTMLInputElement>) => void;
      onKeyDown: (event: KeyboardEvent) => void;
    };
  };
  LinkToolbar: {
    Root: {
      className?: string;
      children?: ReactNode;
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
    };
    Button: {
      className?: string;
      children?: ReactNode;
      mainTooltip: string;
      secondaryTooltip?: string;
      icon?: ReactNode;
      onClick?: (e: MouseEvent) => void;
      isSelected?: boolean;
      isDisabled?: boolean;
    };
  };
  SideMenu: {
    Root: {
      className?: string;
      children?: ReactNode;
    };
    Button: {
      className?: string;
      children?: ReactNode;
      onClick?: (e: MouseEvent) => void;
      icon?: ReactNode;
    };
  };
  SuggestionMenu: {
    Root: {
      className?: string;
      children?: ReactNode;
    };
    EmptyItem: {
      className?: string;
    };
    Item: DefaultReactSuggestionItem & {
      className?: string;
      isSelected: boolean;
      setSelected: (selected: boolean) => void;
      onClick: () => void;
    };
    Label: {
      className?: string;
      children?: ReactNode;
    };
    Loader: {
      className?: string;
    };
  };
  // TableHandle: {
  //   Root: any;
  // };
  // TODO: We should try to make everything as generic as we can
  Generic: {
    Form: {
      Root: {
        children?: ReactNode;
      };
      TextInput: {
        className?: string;
        name: string;
        label?: string;
        icon: ReactNode;
        autoFocus?: boolean;
        placeholder: string;
        value: string;
        onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
        onChange: (event: ChangeEvent<HTMLInputElement>) => void;
        onSubmit: () => void;
      };
    };
    Menu: {
      Root: {
        sub?: boolean;
        position?: "top" | "right" | "bottom" | "left";
        onOpenChange?: (open: boolean) => void;
        children?: ReactNode;
      };
      Divider: {
        className?: string;
      };
      Dropdown: {
        className?: string;
        children?: ReactNode;
        sub?: boolean;
      };
      Item: {
        className?: string;
        children?: ReactNode;

        subTrigger?: boolean;
        icon?: ReactNode;
        checked?: boolean;
        onClick?: () => void;
      };
      Label: {
        className?: string;
        children?: ReactNode;
      };
      Trigger: {
        children?: ReactNode;
        sub?: boolean;
      };
    };
    Popover: {
      Root: {
        children?: ReactNode;
        opened?: boolean;
        position?: "top" | "right" | "bottom" | "left";
      };
      Content: {
        className?: string;
        children?: ReactNode;
      };
      Trigger: {
        children?: ReactNode;
      };
    };
  };
};

export type Components = {
  [Components in keyof Omit<ComponentProps, "Generic">]: {
    [Component in keyof ComponentProps[Components]]: ComponentType<
      ComponentProps[Components][Component]
    >;
  };
} & {
  // only needed as Generic Root/etc elements are 1 level of nesting deeper
  Generic: {
    [GenericComponents in keyof ComponentProps["Generic"]]: {
      [Component in keyof ComponentProps["Generic"][GenericComponents]]: ComponentType<
        ComponentProps["Generic"][GenericComponents][Component]
      >;
    };
  };
};

export const ComponentsContext = createContext<Components | undefined>(
  undefined
);

export function useComponentsContext(): Components | undefined {
  return useContext(ComponentsContext)!;
}
