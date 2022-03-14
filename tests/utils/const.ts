const PORT = 3000;
export const BASE_URL = !process.env.RUN_IN_DOCKER
  ? `http://localhost:${PORT}`
  : `http://host.docker.internal:${PORT}`;

export const EDITOR_SELECTOR = `[data-test="editor"]`;
export const SLASH_MENU_SELECTOR = `[data-tippy-root]`;
export const H_ONE_BLOCK_SELECTOR = `[data-headingtype="1"] > [data-headingtype="1"]`;
export const H_TWO_BLOCK_SELECTOR = `[data-headingtype="2"] > [data-headingtype="2"]`;
export const H_THREE_BLOCK_SELECTOR = `[data-headingtype="3"] > [data-headingtype="3"]`;
export const NUMBERED_LIST_SELECTOR = `[data-listtype="oli"] > [data-listtype="oli"]`;
export const BULLET_LIST_SELECTOR = `[data-listtype="li"] > [data-listtype="li"]`;
export const BLOCK_GROUP_SELECTOR = `[class*="blockGroup"]`;
export const BLOCK_SELECTOR = `[data-id][class*="blockOuter"] > [data-id][class*="block_"]`;
