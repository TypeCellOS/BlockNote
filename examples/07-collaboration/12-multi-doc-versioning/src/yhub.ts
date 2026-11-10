// YHub serves both real-time sync (over WebSocket) and version history (over
// HTTP) for the same documents, all under its `/api` prefix.
export const YHUB_HOST = "yhub.teleportal.tools";
export const YHUB_API_URL = `https://${YHUB_HOST}/api`;
export const YHUB_WS_URL = `wss://${YHUB_HOST}/api/ws/v1`;
