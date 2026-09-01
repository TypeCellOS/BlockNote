import {
  ReactElement,
  ChangeEvent,
  ComponentType,
  createContext,
  CSSProperties,
  ForwardedRef,
  HTMLInputAutoCompleteAttribute,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useContext,
} from "react";

import { BlockNoteEditor, User } from "@blocknote/core";
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
  portalRoot?: HTMLElement | null;
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
      /**
       * Explicit, because the skins' underlying buttons disagree on the
       * default (Mantine's is `type="button"`, shadcn's was `"submit"`) and
       * a submit button inside a `Form.Root` must reliably submit on every
       * skin. `"submit"` buttons need no `onClick` - the form's `onSubmit`
       * is the single commit path, so clicking cannot fire twice.
       */
      type: "button" | "submit";
      onClick?: () => void;
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
      onKeyDown?: (event: KeyboardEvent) => void;
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
      emojiPickerOpen?: boolean;
    };
  };
  Versioning: {
    /**
     * The scrollable container for the version-history sidebar (header +
     * snapshot rows).
     */
    Sidebar: {
      className?: string;
      children?: ReactNode;
    };
    /**
     * A single row in the version-history sidebar — the live "current version"
     * entry or a stored snapshot.
     */
    Snapshot: {
      className?: string;
      /** Whether this row is the version currently shown in the editor. */
      selected?: boolean;
      /** Whether this row is the baseline the current diff is compared against. */
      comparing?: boolean;
      onClick?: () => void;
      /** Row actions (e.g. the "..." menu), revealed on hover. */
      actions?: ReactNode;
      children?: ReactNode;
    };
  };
  AttributionTooltip: {
    /**
     * The attribution tooltip shown when hovering a suggestion mark. Positioned
     * by floating-ui and portaled by the controller — this only styles the box.
     */
    Root: {
      className?: string;
      /**
       * App-supplied class from `getAttributionMarkClassName` (override path).
       * When set, `Root` applies it and ignores `backgroundColor`.
       */
      markClassName?: string;
      /**
       * Per-user author color (default path). Applied inline when there's no
       * `markClassName`, since the tooltip is portaled away from the mark and
       * can't inherit the mark's color.
       */
      backgroundColor?: string;
      children?: ReactNode;
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
        /**
         * Called on the form's `submit` event, which is how the browser
         * reports Enter-to-submit — including when a mobile IME's action key
         * triggers it. Implementations must render a real `<form>` and
         * `preventDefault`, or Enter is left with no submission path at all
         * on platforms that don't dispatch a key event for it.
         *
         * The form context is also what makes Android's IME offer a
         * submitting action at all: without it, it advances focus to the next
         * element on the page instead (verified on a device).
         */
        onSubmit?: () => void;
        /**
         * The form's submit control, rendered inside the `<form>`. Required,
         * because it decides how the form can be committed at all: a submit
         * button is what makes Enter submit a form with more than one field,
         * and it is the control assistive technology activates.
         *
         * Pass `ScreenReaderOnlySubmit` for the usual case (a visually
         * hidden, labelled control), a visible `type="submit"` button to make
         * it double as the form's one submit affordance (the embed tab), or
         * `"none"` to opt out explicitly - then the form must have exactly
         * one field, or Enter reaches nothing.
         */
        submitButton: ReactElement | "none";
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
        onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
        onChange: (event: ChangeEvent<HTMLInputElement>) => void;
        autoComplete?: HTMLInputAutoCompleteAttribute;
        "aria-activedescendant"?: string;
        ref?: ForwardedRef<HTMLInputElement>;
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
        portalRoot?: HTMLElement | null;
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
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        position?:
          | "top"
          | "right"
          | "bottom"
          | "left"
          | `${"top" | "right" | "bottom" | "left"}-${"start" | "end"}`;
        portalRoot?: HTMLElement | null;
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
