const PORT = 3000;
export const BASE_URL = !process.env.RUN_IN_DOCKER
  ? `http://localhost:${PORT}/simple?hideMenu`
  : `http://host.docker.internal:${PORT}/simple?hideMenu`;

export const PASTE_ZONE_SELECTOR = "#pasteZone";

export const EDITOR_SELECTOR = `[data-test="editor"]`;
export const BLOCK_CONTAINER_SELECTOR = `[data-node-type="blockContainer"]`;
export const BLOCK_GROUP_SELECTOR = `[data-node-type="blockGroup"]`;

export const H_ONE_BLOCK_SELECTOR = `[data-content-type=heading][data-level="1"]`;
export const H_TWO_BLOCK_SELECTOR = `[data-content-type=heading][data-level="2"]`;
export const H_THREE_BLOCK_SELECTOR = `[data-content-type=heading][data-level="3"]`;
export const NUMBERED_LIST_SELECTOR = `[data-content-type="numberedListItem"]`;
export const BULLET_LIST_SELECTOR = `[data-content-type="bulletListItem"]`;
export const PARAGRAPH_SELECTOR = `[data-content-type="paragraph"]`;
export const IMAGE_SELECTOR = `[data-content-type="image"]`;

export const DRAG_HANDLE_SELECTOR = `[data-test="dragHandle"]`;
export const DRAG_HANDLE_ADD_SELECTOR = `[data-test="dragHandleAdd"]`;

export const DRAG_HANDLE_MENU_SELECTOR = `.bn-drag-handle-menu`;
export const SLASH_MENU_SELECTOR = `.bn-slash-menu`;

export const ITALIC_BUTTON_SELECTOR = `[data-test="italic"]`;
export const COLORS_BUTTON_SELECTOR = `[data-test="colors"]`;
export const TEXT_COLOR_SELECTOR = (color: string) =>
  `[data-test="text-color-${color}"]`;
export const BACKGROUND_COLOR_SELECTOR = (color: string) =>
  `[data-test="background-color-${color}"]`;
export const ALIGN_TEXT_RIGHT_BUTTON_SELECTOR = `[data-test="alignTextRight"]`;
export const NEST_BLOCK_BUTTON_SELECTOR = `[data-test="nestBlock"]`;
export const UNNEST_BLOCK_BUTTON_SELECTOR = `[data-test="unnestBlock"]`;
export const LINK_BUTTON_SELECTOR = `[data-test="createLink"]`;

export const TYPE_DELAY = 10;
