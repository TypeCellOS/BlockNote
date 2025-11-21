import {} from "@blocknote/core";
import { SideMenu } from "@blocknote/core/extensions";
import {
  SideMenuProps,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { Delete, DragIndicator } from "@mui/icons-material";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { MouseEvent, ReactNode, useCallback, useState } from "react";

// This replaces the default `RemoveBlockItem` component with a simplified
// MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/SideMenu/DragHandleMenu/DefaultItems/RemoveBlockItem.tsx
function MUIRemoveBlockItem(
  props: SideMenuProps & { closeDragHandleMenu: () => void },
) {
  const editor = useBlockNoteEditor();
  const sideMenu = useExtension(SideMenu, { editor });
  // Deletes the block next to the side menu.
  const onClick = useCallback(() => {
    sideMenu.unfreezeMenu();
    props.closeDragHandleMenu();
    editor.removeBlocks([editor.getTextCursorPosition().block]);
    editor.focus();
  }, [props]);

  return (
    <MenuItem onClick={onClick}>
      <ListItemIcon>
        <Delete
          sx={{
            color: (theme) => theme.palette.text.primary,
            padding: "0.1em",
            height: "0.8em",
            width: "0.8em",
          }}
        />
      </ListItemIcon>
      <ListItemText>
        <Typography variant={"body2"}>Delete Block</Typography>
      </ListItemText>
    </MenuItem>
  );
}

// This replaces the default `DragHandleMenu` component with a simplified MUI
// version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/SideMenu/DragHandleMenu/DragHandleMenu.tsx
function MUIDragHandleMenu(props: {
  anchorEl: HTMLElement | null;
  container: Element;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Menu
      open={props.anchorEl !== null}
      container={props.container}
      anchorEl={props.anchorEl}
      onClose={props.onClose}
    >
      {props.children}
    </Menu>
  );
}

// This replaces the default `DragHandleButton` component with a simplified MUI
// version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/SideMenu/DefaultButtons/DragHandleButton.tsx
function MUIDragHandleButton(props: SideMenuProps) {
  // Anchor/trigger element for the color menu.
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const editor = useBlockNoteEditor();
  const sideMenu = useExtension(SideMenu, { editor });
  // Handles opening and closing the drag handle menu.
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      sideMenu.freezeMenu();
      setAnchorEl(event.currentTarget);
    },
    [sideMenu],
  );
  const onClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton
        size={"small"}
        component={"button"}
        draggable={"true"}
        onClick={onClick}
        onDragStart={(e) =>
          sideMenu.blockDragStart(e, sideMenu.store.state!.block)
        }
        onDragEnd={sideMenu.blockDragEnd}
      >
        <DragIndicator
          sx={{
            color: (theme) => theme.palette.text.primary,
          }}
        />
      </IconButton>
      <MUIDragHandleMenu
        container={document.querySelector(".bn-container")!}
        anchorEl={anchorEl}
        onClose={onClose}
      >
        <MUIRemoveBlockItem {...props} closeDragHandleMenu={onClose} />
      </MUIDragHandleMenu>
    </>
  );
}

// This replaces the generic Mantine `SideMenu` component:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/sideMenu/SideMenu.tsx
function MUISideMenu(props: SideMenuProps & { children: ReactNode }) {
  // Since the side menu is positioned by the top-left corner of a block, we
  // manually set its height based on the hovered block so that it's vertically
  // centered.
  const sideMenuHeight = useExtensionState(SideMenu, {
    selector: (state) => {
      // TODO this feels like a hack
      if (state && state.block.type === "heading") {
        if (state.block.props.level === 1) {
          return 78;
        }

        if (state.block.props.level === 2) {
          return 54;
        }

        if (state.block.props.level === 3) {
          return 37;
        }
      }

      return 30;
    },
  });

  return (
    <Box
      sx={{
        height: `${sideMenuHeight}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {props.children}
    </Box>
  );
}

// This replaces the default `SideMenu` component with a simplified MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/SideMenu/SideMenu.tsx
// You can add to or replace the `MUIDragHandleButton` component using the MUI
// `Button` components. Unlike the Formatting Toolbar, we don't use button
// components specific to the Side Menu since there is really nothing more to
// them than just an MUI `IconButton` and some styles passed via the `sx` prop,
// as you can see in `MUIDragHandleButton`.
export function CustomMUISideMenu(props: SideMenuProps) {
  return (
    <MUISideMenu {...props}>
      <MUIDragHandleButton {...props} />
    </MUISideMenu>
  );
}
