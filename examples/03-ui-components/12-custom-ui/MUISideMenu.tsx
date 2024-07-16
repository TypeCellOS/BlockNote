import { SideMenuProps } from "@blocknote/react";
import { Delete, DragIndicator } from "@mui/icons-material";
import {
  Box,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

import { TextBlockSchema } from "./schema";

// Custom component to replace the default Block Side Menu.
export function MUISideMenu(props: SideMenuProps<TextBlockSchema>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Since the side menu is positioned by the top-left corner of a block, we\
  // manually set its height based on the hovered block so that it's vertically
  // centered.
  const sideMenuHeight = useMemo(() => {
    if (props.block.type === "heading") {
      if (props.block.props.level === 1) {
        return 78;
      }

      if (props.block.props.level === 2) {
        return 54;
      }

      if (props.block.props.level === 3) {
        return 37;
      }
    }

    return 30;
  }, [props.block]);

  return (
    <div>
      <Box
        draggable={"true"}
        onClick={(event) => {
          props.freezeMenu();
          setAnchorEl(event.currentTarget);
        }}
        onDragStart={props.blockDragStart}
        onDragEnd={props.blockDragEnd}
        sx={{
          height: `${sideMenuHeight}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <DragIndicator
          sx={{
            color: (theme) => theme.palette.text.primary,
            paddingInline: "4px",
            cursor: "pointer",
            width: "fit-content",
          }}
        />
      </Box>
      <Menu
        open={anchorEl !== null}
        container={document.querySelector(".bn-container")!}
        anchorEl={anchorEl}
        id={"drag-handle-menu"}
        onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            props.unfreezeMenu();
            setAnchorEl(null);
            props.editor.removeBlocks([
              props.editor.getTextCursorPosition().block,
            ]);
            props.editor.focus();
          }}>
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
      </Menu>
    </div>
  );
}
