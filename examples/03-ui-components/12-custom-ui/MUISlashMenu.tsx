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

// Custom component to replace items in the default Slash Menu.
export function MUISlashMenuItem(
  props: Omit<SuggestionMenuProps<DefaultReactSuggestionItem>, "items"> & {
    item: DefaultReactSuggestionItem & { index: number };
  }
) {
  const editor = useBlockNoteEditor<TextBlockSchema>();

  const itemRef = useRef<HTMLDivElement>(null);

  // Scrolls to the item if it's detected to overflow the Slash Menu.
  useEffect(() => {
    if (!itemRef.current || props.item.index !== props.selectedIndex) {
      return;
    }

    const overflow = elementOverflow(
      itemRef.current,
      document.querySelector(".MuiPaper-root:has(.slash-menu)")!
    );

    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [props.item.index, props.selectedIndex]);

  const Icon = props.item.icon;
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

// Custom component to replace the default Slash Menu.
export function MUISlashMenu(
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

  // If query matches no items, shows "No matches" message.
  if (props.items.length === 0) {
    return (
      <Paper
        sx={{
          height: "fit-content",
          width: "100%",
          maxWidth: 360,
        }}>
        <nav className={"slash-menu"} aria-label="slash-menu">
          <List>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemText primary={"No items found"} />
              </ListItemButton>
            </ListItem>
          </List>
        </nav>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        height: "fit-content",
        maxHeight: "100%",
        width: "100%",
        maxWidth: 360,
        overflow: "auto",
      }}>
      <nav className={"slash-menu"} aria-label="slash-menu">
        {Object.entries(groups).map(([group, items]) => (
          // Component for each group
          <List
            key={group}
            component="nav"
            aria-labelledby="nested-list-subheader"
            subheader={
              <ListSubheader
                component="div"
                id={group}
                sx={{
                  backgroundColor: (theme) => theme.palette.background.paper,
                }}>
                {group}
              </ListSubheader>
            }>
            {/* Group items */}
            {items.map((item) => (
              <MUISlashMenuItem key={item.index} item={item} {...props} />
            ))}
          </List>
        ))}
      </nav>
    </Paper>
  );
}
