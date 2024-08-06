import { Block } from "@blocknote/core";
import {
  blockTypeSelectItems,
  useBlockNoteEditor,
  useEditorContentOrSelectionChange,
} from "@blocknote/react";
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
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  SelectChangeEvent,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  MouseEvent,
  useCallback,
  useState,
  useMemo,
  FC,
  ReactNode,
} from "react";

import { TextBlockSchema } from "./schema";

// This replaces the generic Mantine `ToolbarSelect` component with a simplified
// MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/toolbar/ToolbarSelect.tsx
// In this example, we use it to create a replacement for the default Formatting
// Toolbar select element (i.e. the Block Type Select) using MUI, but you can
// also use it to add custom select elements.
function MUIToolbarSelect<Item extends { name: string; icon?: FC }>(props: {
  items: Item[];
  selectedItem: Item;
  onChange: (event: SelectChangeEvent<string>) => void;
}) {
  return (
    <FormControl
      size={"small"}
      fullWidth
      sx={{
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          paddingRight: "1em",
        },
        "& .MuiSelect-select, & .MuiOutlinedInput-notchedOutline, & .MuiSvgIcon-root":
          {
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
      <Select value={props.selectedItem.name} onChange={props.onChange}>
        {props.items.map((item) => (
          <MenuItem key={item.name} value={item.name}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                paddingRight: "1em",
              }}>
              {item.icon && <item.icon />}
            </Box>
            <Box>{item.name}</Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// This replaces the default `BlockTypeSelect` component with a simplified MUI
// version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultSelects/BlockTypeSelect.tsx
function MUIBlockTypeSelect() {
  const editor = useBlockNoteEditor<TextBlockSchema>();

  // The block currently containing the text cursor.
  const [block, setBlock] = useState<Block>(
    editor.getTextCursorPosition().block
  );

  // Updates the block currently containing the text cursor whenever the editor
  // content or selection changes.
  useEditorContentOrSelectionChange(
    () => setBlock(editor.getTextCursorPosition().block),
    editor
  );

  // Gets the default items for the select.
  const defaultBlockTypeSelectItems = useMemo(
    () => blockTypeSelectItems(editor.dictionary),
    [editor.dictionary]
  );

  // Gets the selected item.
  const selectedItem = useMemo(
    () =>
      defaultBlockTypeSelectItems.find((item) =>
        item.isSelected(block as any)
      )!,
    [defaultBlockTypeSelectItems, block]
  );

  // Updates the state when the user chooses an item.
  const onChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const newSelectedItem = defaultBlockTypeSelectItems.find(
        (item) => item.name === event.target.value
      )!;

      editor.updateBlock(block, {
        type: newSelectedItem.type as keyof TextBlockSchema,
        props: newSelectedItem.props,
      });
      editor.focus();

      setBlock(editor.getTextCursorPosition().block);
    },
    [block, defaultBlockTypeSelectItems, editor]
  );

  return (
    <MUIToolbarSelect
      items={defaultBlockTypeSelectItems}
      selectedItem={selectedItem}
      onChange={onChange}
    />
  );
}

// This replaces the generic Mantine `ToolbarButton` component with a simplified
// MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/toolbar/ToolbarButton.tsx
// In this example, we use it to create replacements for the default Formatting
// Toolbar buttons using MUI, but you can also use it to add custom buttons.
function MUIToolbarButton(props: {
  tooltip: string;
  selected?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
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
        {props.children}
      </Button>
    </Tooltip>
  );
}

const basicTextStyleIcons = {
  bold: FormatBold,
  italic: FormatItalic,
  underline: FormatUnderlined,
  strike: FormatStrikethrough,
};

// This replaces the default `BasicTextStyleButton` component with a simplified
// MUI version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultButtons/BasicTextStyleButton.tsx
function MUIBasicTextStyleButton(props: {
  textStyle: "bold" | "italic" | "underline" | "strike";
}) {
  const Icon = basicTextStyleIcons[props.textStyle];
  const editor = useBlockNoteEditor<TextBlockSchema>();

  // Whether the text style is currently active.
  const [textStyleActive, setTextStyleActive] = useState(
    !!editor.getActiveStyles()[props.textStyle]
  );

  // Updates whether the text style is active when the editor content or
  // selection changes.
  useEditorContentOrSelectionChange(
    () => setTextStyleActive(props.textStyle in editor.getActiveStyles()),
    editor
  );

  // Tooltip for the button.
  const tooltip = useMemo(
    () =>
      `Toggle ${props.textStyle
        .slice(0, 1)
        .toUpperCase()}${props.textStyle.slice(1)}`,
    [props.textStyle]
  );

  // Toggles the text style when the button is clicked.
  const onClick = useCallback(() => {
    editor.toggleStyles({ [props.textStyle]: true });
    editor.focus();
  }, [editor, props.textStyle]);

  return (
    <MUIToolbarButton
      tooltip={tooltip}
      selected={textStyleActive}
      onClick={onClick}>
      <Icon sx={{ padding: "0.1em", height: "100%", width: "0.8em" }} />
    </MUIToolbarButton>
  );
}

const textAlignIcons = {
  left: FormatAlignLeft,
  center: FormatAlignCenter,
  right: FormatAlignRight,
};

// This replaces the default `TextAlignButton` component with a simplified MUI
// version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultButtons/TextAlignButton.tsx
function MUITextAlignButton(props: {
  textAlignment: "left" | "center" | "right";
}) {
  const Icon = textAlignIcons[props.textAlignment];
  const editor = useBlockNoteEditor<TextBlockSchema>();

  // The text alignment of the block currently containing the text cursor.
  const [activeTextAlignment, setActiveTextAlignment] = useState(
    () => editor.getTextCursorPosition().block.props.textAlignment
  );

  // Updates the text alignment when the editor content or selection changes.
  useEditorContentOrSelectionChange(
    () =>
      setActiveTextAlignment(
        editor.getTextCursorPosition().block.props.textAlignment
      ),
    editor
  );

  // Tooltip for the button.
  const tooltip = useMemo(
    () =>
      `Align ${props.textAlignment
        .slice(0, 1)
        .toUpperCase()}${props.textAlignment.slice(1)}`,
    [props.textAlignment]
  );

  // Sets the text alignment of the block currently containing the text cursor
  // when the button is clicked.
  const onClick = useCallback(() => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      props: { textAlignment: props.textAlignment },
    });
    editor.focus();
  }, [editor, props.textAlignment]);

  return (
    <MUIToolbarButton
      tooltip={tooltip}
      selected={activeTextAlignment === props.textAlignment}
      onClick={onClick}>
      <Icon sx={{ padding: "0.1em", height: "100%", width: "0.8em" }} />
    </MUIToolbarButton>
  );
}

// The highlight colors used by BlockNote.
const colors = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

// This replaces the default `ColorStyleButton` component with a simplified MUI
// version. The original component can be found here:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultButtons/ColorStyleButton.tsx
function MUIColorStyleButton() {
  const editor = useBlockNoteEditor<TextBlockSchema>();

  // Anchor/trigger element for the color menu.
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // The active text and background colors.
  const [activeTextColor, setActiveTextColor] = useState(
    () => editor.getActiveStyles().textColor || "default"
  );
  const [activeBackgroundColor, setActiveBackgroundColor] = useState(
    () => editor.getActiveStyles().backgroundColor || "default"
  );

  // Updates the active text and background colors when the editor content or
  // selection changes.
  useEditorContentOrSelectionChange(() => {
    const activeStyles = editor.getActiveStyles();

    setActiveTextColor(activeStyles.textColor || "default");
    setActiveBackgroundColor(activeStyles.backgroundColor || "default");
  }, editor);

  // Handles opening and closing the color menu.
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget),
    []
  );
  const onClose = useCallback(() => setAnchorEl(null), []);

  // Set the text or background color and close the color menu when a color is
  // clicked.
  const textColorOnClick = useCallback(
    (textColor: string) => {
      setAnchorEl(null);
      textColor === "default"
        ? editor.removeStyles({ textColor })
        : editor.addStyles({ textColor });
      setTimeout(() => editor.focus());
    },
    [editor]
  );
  const backgroundColorOnClick = useCallback(
    (backgroundColor: string) => {
      setAnchorEl(null);
      backgroundColor === "default"
        ? editor.removeStyles({ backgroundColor })
        : editor.addStyles({ backgroundColor });
      setTimeout(() => editor.focus());
    },
    [editor]
  );

  return (
    <>
      <MUIToolbarButton
        tooltip={"Text & Background Color"}
        selected={anchorEl !== null}
        onClick={onClick}>
        <FormatColorText
          sx={{ padding: "0.1em", height: "100%", width: "0.8em" }}
        />
      </MUIToolbarButton>
      <Menu
        open={anchorEl !== null}
        container={document.querySelector(".bn-container")!}
        anchorEl={anchorEl}
        onClose={onClose}>
        <MenuItem disabled>
          <Typography variant={"body2"}>Text Color</Typography>
        </MenuItem>
        {colors.map((color) => (
          <MenuItem key={color} onClick={() => textColorOnClick(color)}>
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
            {color === activeTextColor && (
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
          <MenuItem key={color} onClick={() => backgroundColorOnClick(color)}>
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
            {color === activeBackgroundColor && (
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

// This replaces the generic Mantine `Toolbar` component:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/mantine/src/toolbar/ToolbarSelect.tsx
// In this example, we use it to create a replacement for the default Formatting
// Toolbar using MUI, but you can also use it to replace the default Link
// Toolbar.
function MUIToolbar(props: { children?: ReactNode }) {
  return (
    <AppBar position="static" sx={{ borderRadius: "4px" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: "1em" }}>
          {props.children}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

// This replaces the default `FormattingToolbar` component with a simplified MUI
// version:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/FormattingToolbar.tsx
// You can remove any of the default selects/buttons, or add custom
// ones as children of the `MUIToolbar` component here.
export function CustomMUIFormattingToolbar() {
  return (
    <MUIToolbar>
      <MUIBlockTypeSelect />
      <ButtonGroup
        size={"small"}
        variant={"text"}
        aria-label="Font style buttons">
        {/* Replaces the `BasicTextStyleButton` component: */}
        <MUIBasicTextStyleButton textStyle={"bold"} />
        <MUIBasicTextStyleButton textStyle={"italic"} />
        <MUIBasicTextStyleButton textStyle={"underline"} />
        <MUIBasicTextStyleButton textStyle={"strike"} />
      </ButtonGroup>
      <ButtonGroup variant="text" aria-label="Text alignment buttons">
        {/* Replaces the `TextAlignButton` component: */}
        <MUITextAlignButton textAlignment={"left"} />
        <MUITextAlignButton textAlignment={"center"} />
        <MUITextAlignButton textAlignment={"right"} />
      </ButtonGroup>
      <ButtonGroup
        size={"small"}
        variant={"text"}
        aria-label={"Text & background color button"}>
        <MUIColorStyleButton />
      </ButtonGroup>
    </MUIToolbar>
  );
}
