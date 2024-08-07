import {
  DefaultReactSuggestionItem,
  elementOverflow,
  SuggestionMenuProps,
  useBlockNoteEditor,
} from "@blocknote/react";
import {
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
} from "@mui/material";
import { useEffect, useMemo, useRef } from "react";

import { TextBlockSchema } from "./schema";

// If you want to change the items in a Suggestion Menu, like the Slash Menu,
// you don't need to modify any of the components in this file. Instead, you
// should change the array returned in the getItems` prop of the
// `SuggestionMenuController` in `App.tsx`. The components in this file are only
// responsible for rendering a Suggestion Menu, not setting its content.

// This replaces the generic Mantine `SuggestionMenuItem` component with a
// simplified MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/suggestionMenu/SuggestionMenuItem.tsx
function MUISuggestionMenuItem(
  props: Omit<SuggestionMenuProps<DefaultReactSuggestionItem>, "items"> & {
    item: DefaultReactSuggestionItem & { index: number };
  }
) {
  const Icon = props.item.icon;
  const editor = useBlockNoteEditor<TextBlockSchema>();

  // Scrolls to the item if it's detected to overflow the Slash Menu.
  const itemRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!itemRef.current || props.item.index !== props.selectedIndex) {
      return;
    }

    const overflow = elementOverflow(
      itemRef.current,
      document.querySelector(
        `.MuiPaper-root:has([aria-label="suggestion-menu"])`
      )!
    );

    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [props.item.index, props.selectedIndex]);

  return (
    <ListItem
      ref={itemRef as any}
      key={props.item.title}
      disablePadding
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
      }}>
      <ListItemButton
        selected={props.item.index === props.selectedIndex}
        onClick={() => {
          props.onItemClick?.(props.item);
          editor.focus();
        }}>
        <ListItemIcon>{Icon}</ListItemIcon>
        <ListItemText
          primary={props.item.title}
          secondary={props.item.subtext}
        />
        {props.item.badge && <Chip label={props.item.badge} size={"small"} />}
      </ListItemButton>
    </ListItem>
  );
}

// This replaces the generic Mantine `EmptySuggestionMenuItem` component with a
// simplified MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/suggestionMenu/EmptySuggestionMenuItem.tsx
function MUIEmptySuggestionMenuItem() {
  return (
    <ListItem disablePadding>
      <ListItemButton>
        <ListItemText primary={"No items found"} />
      </ListItemButton>
    </ListItem>
  );
}

// This replaces the generic Mantine `SuggestionMenuLabel` component with a
// simplified MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/suggestionMenu/SuggestionMenuLabel.tsx
function MUISuggestionMenuLabel(props: { group: string }) {
  return (
    <ListSubheader
      component="div"
      id={props.group}
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
      }}>
      {props.group}
    </ListSubheader>
  );
}

// This replaces the generic Mantine `SuggestionMenu` component with a
// simplified MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/suggestionMenu/SuggestionMenu.tsx
export function MUISuggestionMenu(
  props: SuggestionMenuProps<DefaultReactSuggestionItem>
) {
  // Sorts items into their groups.
  const groups = useMemo(() => {
    const groups: Record<
      string,
      (DefaultReactSuggestionItem & { index: number })[]
    > = {};
    for (let i = 0; i < props.items.length; i++) {
      const item = props.items[i];
      const group = item.group || item.title;

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push({ ...item, index: i });
    }

    return groups;
  }, [props.items]);

  return (
    <Paper
      sx={{
        height: "fit-content",
        maxHeight: "100%",
        maxWidth: 360,
        overflow: "auto",
      }}>
      <nav aria-label="suggestion-menu">
        {props.items.length > 0 ? (
          Object.entries(groups).map(([group, items]) => (
            <List
              key={group}
              component="nav"
              aria-labelledby="nested-list-subheader"
              subheader={<MUISuggestionMenuLabel group={group} />}>
              {items.map((item) => (
                <MUISuggestionMenuItem
                  key={item.index}
                  item={item}
                  {...props}
                />
              ))}
            </List>
          ))
        ) : (
          <List>
            <MUIEmptySuggestionMenuItem />
          </List>
        )}
      </nav>
    </Paper>
  );
}
