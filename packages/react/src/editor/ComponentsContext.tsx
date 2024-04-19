import {
  ChangeEvent,
  ComponentType,
  createContext,
  forwardRef,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useContext,
} from "react";
import { mergeCSSClasses } from "@blocknote/core";

// export type FormProps = {
//   children: ReactNode;
// };
//
// export type MenuProps = {
//   children: ReactNode;
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
//   children: ReactNode;
// };
//
// export type MenuItemProps = {
//   icon?: ReactNode;
//   checked?: boolean;
//   subTrigger?: boolean;
//   onClick?: () => void;
//   children: ReactNode;
// };
//
// export type MenuLabelProps = {
//   children: ReactNode;
// };
//
// export type MenuTriggerProps = {
//   sub?: boolean;
//   children: ReactNode;
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
//   children: ReactNode;
// };
//
// export type PanelFileInputProps = {
//   placeholder?: string;
//   value?: File | null;
//   onChange?: (payload: File | null) => void;
// };
//
// export type PanelTabProps = {
//   children: ReactNode;
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
//   children: ReactNode;
// };
//
// export type PopoverTriggerProps = {
//   children: ReactNode;
// };
//
// export type PopoverContentProps = {
//   children: ReactNode;
// };
//
// export type SuggestionMenuEmptyItemProps = {
//   children: ReactNode;
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
//   children: ReactNode;
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
//   children: ReactNode;
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
      children: ReactNode;
    };
    Button: {
      className?: string;
      mainTooltip: string;
      secondaryTooltip?: string;
      icon?: ReactNode;
      onClick?: (e: MouseEvent) => void;
      isSelected?: boolean;
      isDisabled?: boolean;
      children?: ReactNode;
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
      onClick: () => void;
      children: ReactNode;
    };
    FileInput: {
      className?: string;
      value: File | null;
      placeholder: string;
      onChange: (payload: File | null) => void;
    };
    TabPanel: {
      className?: string;
      children: ReactNode;
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
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
      children: ReactNode;
    };
    Button: {
      className?: string;
      mainTooltip: string;
      secondaryTooltip?: string;
      icon?: ReactNode;
      onClick?: (e: MouseEvent) => void;
      isSelected?: boolean;
      isDisabled?: boolean;
      children?: ReactNode;
    };
  };
  // SideMenu: {
  //   Root: any;
  // };
  // SuggestionMenu: {
  //   Root: any;
  //   EmptyItem: any;
  //   Item: any;
  //   Label: any;
  //   Loader: any;
  // };
  // TableHandle: {
  //   Root: any;
  // },
  Generic: {
    Form: {
      Root: {
        children: ReactNode;
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
        children: ReactNode;
      };
      Divider: {
        className: string;
      };
      Dropdown: {
        className?: string;
        sub?: boolean;
        children: ReactNode;
      };
      Item: {
        className?: string;
        subTrigger?: boolean;
        icon?: ReactNode;
        checked?: boolean;
        onClick?: () => void;
        children: ReactNode;
      };
      Label: {
        className?: string;
        children: ReactNode;
      };
      Trigger: {
        sub?: boolean;
        children: ReactNode;
      };
    };
    Popover: {
      Root: {
        opened?: boolean;
        position?: "top" | "right" | "bottom" | "left";
        children: ReactNode;
      };
      Content: {
        className?: string;
        children: ReactNode;
      };
      Trigger: {
        children: ReactNode;
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

// TODO: We should be able to apply the class names in a smarter way
export const createComponentsContext = (Components: Components): Components => {
  return {
    FormattingToolbar: {
      Root: (props) => {
        const { className, children, ...rest } = props;

        return (
          <Components.FormattingToolbar.Root
            {...rest}
            className={mergeCSSClasses(
              "bn-formatting-toolbar bn-toolbar",
              className || ""
            )}>
            {children}
          </Components.FormattingToolbar.Root>
        );
      },
      Button: forwardRef<
        HTMLElement,
        ComponentProps["FormattingToolbar"]["Button"]
      >((props, ref) => {
        const { className, children, ...rest } = props;

        return (
          <Components.FormattingToolbar.Button
            {...rest}
            className={mergeCSSClasses("bn-button", className || "")}
            // @ts-ignore
            ref={ref}>
            {children}
          </Components.FormattingToolbar.Button>
        );
      }),
      Select: (props) => (
        <Components.FormattingToolbar.Select
          {...props}
          className={mergeCSSClasses("bn-select", props.className || "")}
        />
      ),
    },
    ImagePanel: {
      Root: (props) => (
        <Components.ImagePanel.Root
          {...props}
          className={mergeCSSClasses(
            "bn-image-panel bn-panel",
            props.className || ""
          )}
        />
      ),
      Button: (props) => {
        const { className, children, ...rest } = props;

        return (
          <Components.ImagePanel.Button
            {...rest}
            className={mergeCSSClasses("bn-button", className || "")}>
            {children}
          </Components.ImagePanel.Button>
        );
      },
      FileInput: (props) => (
        <Components.ImagePanel.FileInput
          {...props}
          className={mergeCSSClasses("bn-file-input", props.className || "")}
        />
      ),
      TabPanel: (props) => {
        const { className, children, ...rest } = props;

        return (
          <Components.ImagePanel.TabPanel
            {...rest}
            className={mergeCSSClasses("bn-tab-panel", className || "")}>
            {children}
          </Components.ImagePanel.TabPanel>
        );
      },
      TextInput: (props) => (
        <Components.ImagePanel.TextInput
          {...props}
          className={mergeCSSClasses("bn-text-input", props.className || "")}
        />
      ),
    },
    LinkToolbar: {
      Root: (props) => {
        const { className, children, ...rest } = props;

        return (
          <Components.LinkToolbar.Root
            {...rest}
            className={mergeCSSClasses(
              "bn-link-toolbar bn-toolbar",
              className || ""
            )}>
            {children}
          </Components.LinkToolbar.Root>
        );
      },
      Button: (props) => {
        const { className, children, ...rest } = props;

        return (
          <Components.LinkToolbar.Button
            {...rest}
            className={mergeCSSClasses("bn-button", className || "")}>
            {children}
          </Components.LinkToolbar.Button>
        );
      },
    },
    Generic: {
      Form: {
        Root: Components.Generic.Form.Root,
        TextInput: (props) => (
          <Components.Generic.Form.TextInput
            {...props}
            className={mergeCSSClasses("bn-text-input", props.className || "")}
          />
        ),
      },
      Menu: {
        Root: Components.Generic.Menu.Root,
        Divider: (props) => (
          <Components.Generic.Menu.Divider
            {...props}
            className={mergeCSSClasses("bn-menu-divider", props.className)}
          />
        ),
        Dropdown: (props) => {
          const { className, children, ...rest } = props;

          return (
            <Components.Generic.Menu.Dropdown
              {...rest}
              className={mergeCSSClasses("bn-menu-dropdown", className || "")}>
              {children}
            </Components.Generic.Menu.Dropdown>
          );
        },
        Item: (props) => {
          const { className, children, ...rest } = props;

          return (
            <Components.Generic.Menu.Item
              {...rest}
              className={mergeCSSClasses("bn-menu-item", className || "")}>
              {children}
            </Components.Generic.Menu.Item>
          );
        },
        Label: (props) => {
          const { className, children, ...rest } = props;

          return (
            <Components.Generic.Menu.Label
              {...rest}
              className={mergeCSSClasses("bn-menu-label", className || "")}>
              {children}
            </Components.Generic.Menu.Label>
          );
        },
        Trigger: Components.Generic.Menu.Trigger,
      },
      Popover: {
        Root: Components.Generic.Popover.Root,
        Content: (props) => {
          const { className, children, ...rest } = props;

          return (
            <Components.Generic.Popover.Content
              {...rest}
              className={mergeCSSClasses(
                "bn-popover-content",
                className || ""
              )}>
              {children}
            </Components.Generic.Popover.Content>
          );
        },
        Trigger: Components.Generic.Popover.Trigger,
      },
    },
  };
};

export function useComponentsContext(): Components | undefined {
  return useContext(ComponentsContext)!;
}
