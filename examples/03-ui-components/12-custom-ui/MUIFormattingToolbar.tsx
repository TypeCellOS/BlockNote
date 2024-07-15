import { checkBlockHasDefaultProp, DefaultBlockSchema } from "@blocknote/core";
import {
  blockTypeSelectItems,
  useBlockNoteEditor,
  useEditorContentOrSelectionChange,
} from "@blocknote/react";
import { MouseEvent, useCallback, useState, useMemo } from "react";

import {
  Done,
  FormatAlignCenter,
  FormatAlignLeft,
  FormatAlignRight,
  FormatBold,
  FormatColorText,
  FormatItalic,
  FormatStrikethrough,
  FormatUnderlined,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  ButtonGroup,
  Container,
  Divider,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  SvgIconTypeMap,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";

const colors = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

// Custom component to replace the Block Type Select.
function MUIBlockTypeSelect(props: {
  blockType: keyof DefaultBlockSchema;
  setBlockType: (blockType: keyof DefaultBlockSchema) => void;
  blockTypeSelectItems: ReturnType<typeof blockTypeSelectItems>;
}) {
  return (
    <FormControl
      size={"small"}
      fullWidth
      sx={{
        "& #block-type-select": {
          display: "flex",
          alignItems: "center",
          paddingRight: "1em",
        },
        "& #block-type-select, & label, & fieldset, & svg": {
          color: (theme) =>
            `${
              theme.palette.mode === "dark"
                ? theme.palette.primary.main
                : theme.palette.background.default
            } !important`,
          borderColor: (theme) =>
            `${
              theme.palette.mode === "dark"
                ? theme.palette.primary.main
                : theme.palette.background.default
            } !important`,
        },
      }}>
      <InputLabel id={"block-type-select-label"}>Block Type</InputLabel>
      <Select
        labelId={"block-type-select-label"}
        id={"block-type-select"}
        value={props.blockType}
        label={"Block Type"}
        onChange={(event) =>
          props.setBlockType(event.target.value as keyof DefaultBlockSchema)
        }>
        {props.blockTypeSelectItems.map((item) => (
          <MenuItem key={item.type} value={item.type}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                paddingRight: "1em",
              }}>
              <item.icon />
            </Box>
            <Box>{item.name}</Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Custom component to replace the default formatting toolbar buttons.
function MUIFormattingToolbarButton(props: {
  tooltip: string;
  selected?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  icon: OverridableComponent<SvgIconTypeMap<Record<string, any>, "svg">> & {
    muiName: string;
  };
}) {
  const Icon = props.icon;

  return (
    <Tooltip title={props.tooltip} arrow>
      <Button
        size={"small"}
        variant={props.selected ? "contained" : "text"}
        onClick={props.onClick}
        sx={{
          my: 2,
          color: (theme) =>
            !props.selected
              ? theme.palette.mode === "dark"
                ? theme.palette.primary.main
                : theme.palette.background.default
              : undefined,
          display: "block",
        }}>
        <Icon sx={{ padding: "0.1em", height: "100%", width: "0.8em" }} />
      </Button>
    </Tooltip>
  );
}

// Custom component to replace the default color picker menu.
function MUIColorMenuButton(props: {
  textColor: string;
  applyTextColor: (textColor: string) => void;
  backgroundColor: string;
  applyBackgroundColor: (backgroundColor: string) => void;
}) {
  const editor = useBlockNoteEditor();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <MUIFormattingToolbarButton
        tooltip={"Text & Background Color"}
        selected={anchorEl !== null}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        icon={FormatColorText}
      />
      <Menu
        open={anchorEl !== null}
        disablePortal={true}
        anchorEl={anchorEl}
        id={"color-menu"}
        onClose={() => setAnchorEl(null)}>
        <MenuItem disabled>
          <Typography variant={"body2"}>Text Color</Typography>
        </MenuItem>
        {colors.map((color) => (
          <MenuItem
            key={color}
            onClick={() => {
              setAnchorEl(null);
              props.applyTextColor(color);
              setTimeout(() => editor.focus());
            }}>
            <ListItemIcon>
              <FormatColorText
                className={"text-" + color}
                sx={{ padding: "0.1em", height: "0.8em", width: "0.8em" }}
              />
            </ListItemIcon>
            <ListItemText>
              <Typography variant={"body2"}>
                {color.slice(0, 1).toUpperCase() + color.slice(1)}
              </Typography>
            </ListItemText>
            {color === props.textColor && (
              <Done
                sx={{ padding: "0.1em", height: "0.8em", width: "0.8em" }}
              />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem disabled>
          <Typography variant={"body2"}>Background Color</Typography>
        </MenuItem>
        {colors.map((color) => (
          <MenuItem
            key={color}
            onClick={() => {
              setAnchorEl(null);
              props.applyBackgroundColor(color);
              setTimeout(() => editor.focus());
            }}>
            <ListItemIcon>
              <FormatColorText
                className={"background-" + color}
                sx={{ padding: "0.1em", height: "0.8em", width: "0.8em" }}
              />
            </ListItemIcon>
            <ListItemText>
              <Typography variant={"body2"}>
                {color.slice(0, 1).toUpperCase() + color.slice(1)}
              </Typography>
            </ListItemText>
            {color === props.backgroundColor && (
              <Done
                sx={{ padding: "0.1em", height: "0.8em", width: "0.8em" }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function MUIFormattingToolbar() {
  const editor = useBlockNoteEditor();

  const defaultBlockTypeSelectItems = useMemo(
    () => blockTypeSelectItems(editor.dictionary),
    [editor.dictionary]
  );
  const block = editor.getTextCursorPosition().block;
  const activeStyles = editor.getActiveStyles();

  // States for the toolbar items.
  const [blockType, setBlockType] = useState<keyof DefaultBlockSchema>(
    block.type
  );

  const [bold, setBold] = useState(!!activeStyles.bold);
  const [italic, setItalic] = useState(!!activeStyles.italic);
  const [underline, setUnderline] = useState(!!activeStyles.underline);
  const [strike, setStrike] = useState(!!activeStyles.strike);

  const [textAlignment, setTextAlignment] = useState<
    "left" | "center" | "right" | "justify" | undefined
  >(() =>
    checkBlockHasDefaultProp("textAlignment", block, editor)
      ? block.props.textAlignment
      : undefined
  );

  const [textColor, setTextColor] = useState<string>(
    activeStyles.textColor || "default"
  );
  const [backgroundColor, setBackgroundColor] = useState<string>(
    activeStyles.backgroundColor || "default"
  );

  // Updates the states when the editor content or selection changes.
  useEditorContentOrSelectionChange(() => {
    const block = editor.getTextCursorPosition().block;
    const activeStyles = editor.getActiveStyles();

    setBlockType(block.type);

    setBold("bold" in activeStyles);
    setItalic("italic" in activeStyles);
    setUnderline("underline" in activeStyles);
    setStrike("strike" in activeStyles);

    setTextAlignment(
      checkBlockHasDefaultProp("textAlignment", block, editor)
        ? block.props.textAlignment
        : undefined
    );

    setTextColor(activeStyles.textColor || "default");
    setBackgroundColor(activeStyles.backgroundColor || "default");
  }, editor);

  // Callbacks for clicking the toolbar buttons.
  const applyBold = useCallback(
    () => editor.toggleStyles({ bold: true }),
    [editor]
  );
  const applyItalic = useCallback(
    () => editor.toggleStyles({ italic: true }),
    [editor]
  );
  const applyUnderline = useCallback(
    () => editor.toggleStyles({ underline: true }),
    [editor]
  );
  const applyStrike = useCallback(
    () => editor.toggleStyles({ strike: true }),
    [editor]
  );

  const applyTextAlignment = useCallback(
    (textAlignment: "left" | "center" | "right" | "justify") => {
      editor.updateBlock(editor.getTextCursorPosition().block, {
        props: { textAlignment },
      });
    },
    [editor]
  );

  const applyTextColor = useCallback(
    (textColor: string) =>
      textColor === "default"
        ? editor.removeStyles({ textColor })
        : editor.addStyles({ textColor }),
    [editor]
  );
  const applyBackgroundColor = useCallback(
    (backgroundColor: string) =>
      backgroundColor === "default"
        ? editor.removeStyles({ backgroundColor })
        : editor.addStyles({ backgroundColor }),
    [editor]
  );

  return (
    <AppBar position="static" sx={{ borderRadius: "4px" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: "1em" }}>
          <MUIBlockTypeSelect
            blockType={blockType}
            setBlockType={setBlockType}
            blockTypeSelectItems={defaultBlockTypeSelectItems}
          />
          <ButtonGroup
            size={"small"}
            variant="text"
            aria-label="Font style buttons">
            <MUIFormattingToolbarButton
              tooltip={"Toggle Bold"}
              selected={bold}
              onClick={() => {
                applyBold();
                editor.focus();
              }}
              icon={FormatBold}
            />
            <MUIFormattingToolbarButton
              tooltip={"Toggle Italic"}
              selected={italic}
              onClick={() => {
                applyItalic();
                editor.focus();
              }}
              icon={FormatItalic}
            />
            <MUIFormattingToolbarButton
              tooltip={"Toggle Underline"}
              selected={underline}
              onClick={() => {
                applyUnderline();
                editor.focus();
              }}
              icon={FormatUnderlined}
            />
            <MUIFormattingToolbarButton
              tooltip={"Toggle Strike"}
              selected={strike}
              onClick={() => {
                applyStrike();
                editor.focus();
              }}
              icon={FormatStrikethrough}
            />
          </ButtonGroup>
          <ButtonGroup variant="text" aria-label="Text alignment buttons">
            <MUIFormattingToolbarButton
              tooltip={"Align Left"}
              selected={textAlignment === "left"}
              onClick={() => {
                applyTextAlignment("left");
                editor.focus();
              }}
              icon={FormatAlignLeft}
            />
            <MUIFormattingToolbarButton
              tooltip={"Align Center"}
              selected={textAlignment === "center"}
              onClick={() => {
                applyTextAlignment("center");
                editor.focus();
              }}
              icon={FormatAlignCenter}
            />
            <MUIFormattingToolbarButton
              tooltip={"Align Right"}
              selected={textAlignment === "right"}
              onClick={() => {
                applyTextAlignment("right");
                editor.focus();
              }}
              icon={FormatAlignRight}
            />
          </ButtonGroup>
          <ButtonGroup
            size={"small"}
            variant="text"
            aria-label="Text & background color buttons">
            <MUIColorMenuButton
              textColor={textColor}
              applyTextColor={applyTextColor}
              backgroundColor={backgroundColor}
              applyBackgroundColor={applyBackgroundColor}
            />
          </ButtonGroup>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
