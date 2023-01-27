const PORT = 3000;
export const BASE_URL = !process.env.RUN_IN_DOCKER
  ? `http://localhost:${PORT}`
  : `http://host.docker.internal:${PORT}`;

export const EDITOR_SELECTOR = `[data-test="editor"]`;
export const BLOCK_CONTAINER_SELECTOR = `[data-node-type="blockContainer"]`;
export const BLOCK_GROUP_SELECTOR = `[data-node-type="blockGroup"]`;

export const H_ONE_BLOCK_SELECTOR = `[data-content-type=heading][data-level="1"]`;
export const H_TWO_BLOCK_SELECTOR = `[data-content-type=heading][data-level="2"]`;
export const H_THREE_BLOCK_SELECTOR = `[data-content-type=heading][data-level="3"]`;
export const NUMBERED_LIST_SELECTOR = `[data-content-type="numberedListItem"]`;
export const BULLET_LIST_SELECTOR = `[data-content-type="bulletListItem"]`;
export const PARAGRAPH_SELECTOR = `[data-content-type="paragraph"]`;

export const DRAG_HANDLE_SELECTOR = `[data-test="dragHandle"]`;
export const DRAG_HANDLE_ADD_SELECTOR = `[data-test="dragHandleAdd"]`;

export const DRAG_HANDLE_MENU_SELECTOR = `.mantine-DragHandleMenu-root`;
export const SLASH_MENU_SELECTOR = `.mantine-SlashMenu-root`;

export const TYPE_DELAY = 10;
