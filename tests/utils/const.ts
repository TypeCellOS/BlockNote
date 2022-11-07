const PORT = 3000;
export const BASE_URL = !process.env.RUN_IN_DOCKER
  ? `http://localhost:${PORT}`
  : `http://host.docker.internal:${PORT}`;

export const EDITOR_SELECTOR = `[data-test="editor"]`;
export const SLASH_MENU_SELECTOR = `.mantine-SuggestionList-root`;
export const H_ONE_BLOCK_SELECTOR = `[data-heading-type="1"] > [data-heading-type="1"]`;
export const H_TWO_BLOCK_SELECTOR = `[data-heading-type="2"] > [data-heading-type="2"]`;
export const H_THREE_BLOCK_SELECTOR = `[data-heading-type="3"] > [data-heading-type="3"]`;
export const NUMBERED_LIST_SELECTOR = `[data-list-type="oli"] > [data-list-type="oli"]`;
export const BULLET_LIST_SELECTOR = `[data-list-type="li"] > [data-list-type="li"]`;
export const BLOCK_GROUP_SELECTOR = `[data-node-type="block-group"]`;
export const BLOCK_SELECTOR = `[data-node-type="block"]`;
export const BLOCK_CONTENT_SELECTOR = `[data-node-type="block-content"]`;
export const DRAG_HANDLE = `[data-test="dragHandle"]`;
export const DRAG_HANDLE_ADD = `[data-test="dragHandleAdd"]`;
export const DRAG_HANDLE_MENU_SELECTOR = `.mantine-DragHandleMenu-root`;
export const TYPE_DELAY = 10;
