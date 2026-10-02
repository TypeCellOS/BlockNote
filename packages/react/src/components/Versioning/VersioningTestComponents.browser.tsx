import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  type BlockNoteEditor,
  type BlockSchema,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";

import {
  ComponentsContext,
  type Components,
  type ComponentProps,
} from "../../editor/ComponentsContext.js";
import { BlockNoteViewRaw } from "../../editor/BlockNoteView.js";

function Container(props: { className?: string; children?: ReactNode }) {
  return <div className={props.className}>{props.children}</div>;
}

function Empty(props: { className?: string }) {
  return <div className={props.className} />;
}

function ToolbarRoot(props: ComponentProps["Generic"]["Toolbar"]["Root"]) {
  return (
    <div
      className={props.className}
      role="toolbar"
      aria-label={props["aria-label"]}
    >
      {props.children}
    </div>
  );
}

function ToolbarButton(
  props: ComponentProps["Generic"]["Toolbar"]["Button"] & {
    "aria-controls"?: string;
    "aria-expanded"?: boolean;
  },
) {
  return (
    <button
      className={props.className}
      aria-label={props.label}
      aria-controls={props["aria-controls"]}
      aria-expanded={props["aria-expanded"]}
      disabled={props.isDisabled}
      onClick={props.onClick}
      type="button"
    >
      {props.children ?? props.label}
    </button>
  );
}

type MenuState = {
  id: string;
  open: boolean;
  setOpen(open: boolean): void;
};

const MenuContext = createContext<MenuState | undefined>(undefined);

function MenuRoot(props: ComponentProps["Generic"]["Menu"]["Root"]) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <MenuContext.Provider
      value={{
        id,
        open,
        setOpen(next) {
          setOpen(next);
          props.onOpenChange?.(next);
        },
      }}
    >
      {props.children}
    </MenuContext.Provider>
  );
}

function MenuTrigger(props: ComponentProps["Generic"]["Menu"]["Trigger"]) {
  const menu = useContext(MenuContext)!;
  const child = props.children;
  if (
    !isValidElement<{
      "aria-controls"?: string;
      "aria-expanded"?: boolean;
      onClick?: (event: MouseEvent) => void;
    }>(child)
  ) {
    return null;
  }
  return cloneElement(child, {
    "aria-controls": menu.id,
    "aria-expanded": menu.open,
    onClick(event: MouseEvent) {
      child.props.onClick?.(event);
      menu.setOpen(!menu.open);
    },
  });
}

function MenuDropdown(props: ComponentProps["Generic"]["Menu"]["Dropdown"]) {
  const menu = useContext(MenuContext)!;
  if (!menu.open) {
    return null;
  }
  return createPortal(
    <div id={menu.id} className={props.className} role="menu">
      {props.children}
    </div>,
    document.body,
  );
}

function MenuItem(props: ComponentProps["Generic"]["Menu"]["Item"]) {
  const menu = useContext(MenuContext)!;
  return (
    <button
      className={props.className}
      disabled={props.disabled}
      role="menuitem"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (!props.disabled) {
          props.onClick?.();
          menu.setOpen(false);
        }
      }}
    >
      {props.icon}
      {props.children}
    </button>
  );
}

function VersioningSidebar(props: ComponentProps["Versioning"]["Sidebar"]) {
  return (
    <section
      className={props.className}
      aria-label={props["aria-label"]}
      role="region"
    >
      {props.children}
    </section>
  );
}

function VersioningHeader(props: ComponentProps["Versioning"]["Header"]) {
  return (
    <header className={props.className}>
      <h2>{props.title}</h2>
      {props.actions}
      {props.closeAction}
    </header>
  );
}

function VersioningName(props: ComponentProps["Versioning"]["Name"]) {
  if (props.mode === "display") {
    return <span className="bn-snapshot-name">{props.value}</span>;
  }
  return (
    <input
      className="bn-snapshot-name"
      ref={props.inputRef}
      value={props.value}
      placeholder={props.placeholder}
      aria-label={props["aria-label"]}
      onBlur={props.onBlur}
      onChange={props.onChange}
      onClick={props.onClick}
      onKeyDown={props.onKeyDown}
    />
  );
}

function VersioningSnapshot(props: ComponentProps["Versioning"]["Snapshot"]) {
  const stateClass =
    props.state === "comparison-baseline"
      ? "comparing"
      : props.state === "comparison-source"
        ? "bn-snapshot-comparison-source"
        : undefined;
  return (
    <div
      id={props.id}
      className={[props.className, stateClass].filter(Boolean).join(" ")}
      role="listitem"
      aria-label={props["aria-label"]}
      aria-current={
        props.state === "selected" || props.state === "comparison-source"
          ? "true"
          : undefined
      }
      aria-busy={props["aria-busy"]}
      tabIndex={props.tabIndex}
      onClick={props.onClick}
      onFocus={props.onFocus}
      onKeyDown={props.onKeyDown}
    >
      {props.name}
      {props.date && <span>{props.date}</span>}
      {props.restoredFrom && <span>{props.restoredFrom}</span>}
      {props.secondaryLabel && <span>{props.secondaryLabel}</span>}
      {props.comparingLabel && <span>{props.comparingLabel}</span>}
      {props.comparingIcon}
      {props.actions}
    </div>
  );
}

const testComponents: Components = {
  FormattingToolbar: {
    Root: ToolbarRoot,
    Button: ToolbarButton,
    Select: Empty,
  },
  FilePanel: {
    Root: Container,
    Button: ToolbarButton,
    FileInput: Empty,
    TabPanel: Container,
    TextInput: Empty,
  },
  LinkToolbar: {
    Root: ToolbarRoot,
    Button: ToolbarButton,
    Select: Empty,
  },
  SideMenu: { Root: Container, Button: ToolbarButton },
  SuggestionMenu: {
    Root: Container,
    EmptyItem: Container,
    Item: Container,
    Label: Container,
    Loader: Empty,
  },
  GridSuggestionMenu: {
    Root: Container,
    EmptyItem: Container,
    Item: Container,
    Loader: Container,
  },
  TableHandle: { Root: Container, ExtendButton: Container },
  Comments: {
    Card: Container,
    CardSection: Container,
    ExpandSectionsPrompt: Container,
    Editor: Empty,
    Comment: Container,
  },
  Versioning: {
    Sidebar: VersioningSidebar,
    Header: VersioningHeader,
    Name: VersioningName,
    Snapshot: VersioningSnapshot,
    Loader: Empty,
  },
  AttributionTooltip: { Root: Container },
  Generic: {
    Badge: { Root: Empty, Group: Container },
    Form: { Root: Container, TextInput: Empty },
    Menu: {
      Root: MenuRoot,
      Divider: Empty,
      Dropdown: MenuDropdown,
      Item: MenuItem,
      Label: Container,
      Trigger: MenuTrigger,
      Button: ToolbarButton,
    },
    Popover: { Root: Container, Content: Container, Trigger: Container },
    Toolbar: { Root: ToolbarRoot, Button: ToolbarButton, Select: Empty },
  },
};

export function VersioningTestView<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(props: {
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
  children?: ReactNode;
}) {
  return (
    <ComponentsContext.Provider value={testComponents}>
      <BlockNoteViewRaw editor={props.editor}>
        {props.children}
      </BlockNoteViewRaw>
    </ComponentsContext.Provider>
  );
}
