import {
  ChangeEvent,
  ComponentType,
  createContext,
  CSSProperties,
  HTMLInputAutoCompleteAttribute,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useContext,
} from "react";

import { BlockNoteEditor } from "@blocknote/core";
import { User } from "@blocknote/core/comments";
import { DefaultReactGridSuggestionItem } from "../components/SuggestionMenu/GridSuggestionMenu/types.js";
import { DefaultReactSuggestionItem } from "../components/SuggestionMenu/types.js";

type ToolbarRootType = {
  className?: string;
  children?: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  variant?: "default" | "action-toolbar";
};

type ToolbarButtonType = {
  className?: string;
  mainTooltip?: string;
  secondaryTooltip?: string;
  icon?: ReactNode;
  onClick?: (e: MouseEvent) => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  variant?: "default" | "compact";
} & (
  | { children: ReactNode; label?: string }
  | { children?: undefined; label: string }
);

type ToolbarSelectType = {
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

type MenuButtonType = {
  className?: string;
  onClick?: (e: MouseEvent) => void;
  icon?: ReactNode;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  draggable?: boolean;
} & (
  | { children: ReactNode; label?: string }
  | { children?: undefined; label: string }
);

export type ComponentProps = {
  FormattingToolbar: {
    Root: ToolbarRootType;
    Button: ToolbarButtonType;
    Select: ToolbarSelectType;
  };
  FilePanel: {
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
    };
    Button: {
      className?: string;
      onClick: () => void;
    } & (
      | { children: ReactNode; label?: string }
      | { children?: undefined; label: string }
    );
    FileInput: {
      className?: string;
      accept: string;
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
    Root: ToolbarRootType;
    Button: ToolbarButtonType;
    Select: ToolbarSelectType;
  };
  SideMenu: {
    Root: {
      className?: string;
      children?: ReactNode;
    };
    Button: {
      className?: string;
      onClick?: (e: MouseEvent) => void;
      icon?: ReactNode;
      onDragStart?: (e: React.DragEvent) => void;
      onDragEnd?: (e: React.DragEvent) => void;
      draggable?: boolean;
    } & (
      | { children: ReactNode; label?: string }
      | { children?: undefined; label: string }
    );
  };
  SuggestionMenu: {
    Root: {
      id: string;
      className?: string;
      children?: ReactNode;
    };
    EmptyItem: {
      className?: string;
      children?: ReactNode;
    };
    Item: {
      className?: string;
      id: string;
      isSelected: boolean;
      onClick: () => void;
      item: Omit<DefaultReactSuggestionItem, "onItemClick">;
    };
    Label: {
      className?: string;
      children?: ReactNode;
    };
    Loader: {
      className?: string;
    };
  };
  GridSuggestionMenu: {
    Root: {
      id: string;
      columns: number;
      className?: string;
      children?: ReactNode;
    };
    EmptyItem: {
      columns: number;
      className?: string;
      children?: ReactNode;
    };
    Item: {
      className?: string;
      id: string;
      isSelected: boolean;
      onClick: () => void;
      item: DefaultReactGridSuggestionItem;
    };
    // Label: {
    //   className?: string;
    //   children?: ReactNode;
    // };
    Loader: {
      columns: number;
      className?: string;
      children?: ReactNode;
    };
  };
  TableHandle: {
    Root: {
      className?: string;
      draggable: boolean;
      onDragStart: (e: React.DragEvent) => void;
      onDragEnd: () => void;
      style?: CSSProperties;
    } & (
      | { children: ReactNode; label?: string }
      | { children?: undefined; label: string }
    );
    ExtendButton: {
      className?: string;
      onClick: (e: React.MouseEvent) => void;
      onMouseDown: (e: React.MouseEvent) => void;
      children: ReactNode;
    };
  };
  Comments: {
    Card: {
      className?: string;
      headerText?: string;
      selected?: boolean;
      onFocus?: (event: React.FocusEvent) => void;
      onBlur?: (event: React.FocusEvent) => void;
      tabIndex?: number;
      children?: ReactNode;
    };
    CardSection: {
      className?: string;
      children?: ReactNode;
    };
    ExpandSectionsPrompt: {
      className?: string;
      children?: ReactNode;
    };
    Editor: {
      className?: string;
      autoFocus?: boolean;
      editable: boolean;
      editor: BlockNoteEditor<any, any, any>;
      onFocus?: () => void;
      onBlur?: () => void;
    };
    Comment: {
      className?: string;
      children?: ReactNode;
      authorInfo: "loading" | User;
      timeString: string;
      edited: boolean;
      actions?: ReactNode;
      showActions?: boolean | "hover";
    };
  };
  // TODO: We should try to make everything as generic as we can
  Generic: {
    Badge: {
      Root: {
        className?: string;
        text: string;
        icon?: ReactNode;
        isSelected?: boolean;
        mainTooltip?: string;
        secondaryTooltip?: string;
        onClick?: (event: React.MouseEvent) => void;
        onMouseEnter?: () => void;
      };
      Group: {
        className?: string;
        children: ReactNode;
      };
    };
    Form: {
      Root: {
        children?: ReactNode;
      };
      TextInput: {
        className?: string;
        name: string;
        label?: string;
        variant?: "default" | "large";
        icon: ReactNode;
        rightSection?: ReactNode;
        autoFocus?: boolean;
        placeholder?: string;
        disabled?: boolean;
        value: string;
        onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
        onChange: (event: ChangeEvent<HTMLInputElement>) => void;
        onSubmit?: () => void;
        autoComplete?: HTMLInputAutoCompleteAttribute;
      };
    };
    Menu: {
      Root: {
        sub?: boolean;
        onOpenChange?: (open: boolean) => void;
        position?:
          | "top"
          | "right"
          | "bottom"
          | "left"
          | `${"top" | "right" | "bottom" | "left"}-${"start" | "end"}`;
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
      Button: MenuButtonType;
    };
    Popover: {
      Root: {
        opened?: boolean;
        position?:
          | "top"
          | "right"
          | "bottom"
          | "left"
          | `${"top" | "right" | "bottom" | "left"}-${"start" | "end"}`;
        children?: ReactNode;
      };
      Content: {
        className?: string;
        variant: "form-popover" | "panel-popover";
        children?: ReactNode;
      };
      Trigger: {
        children?: ReactNode;
      };
    };
    Toolbar: {
      Root: ToolbarRootType;
      Button: ToolbarButtonType;
      Select: ToolbarSelectType;
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
  undefined,
);

export function useComponentsContext(): Components | undefined {
  return useContext(ComponentsContext)!;
}
