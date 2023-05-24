import type { PartyKitServer } from "partykit/server";
import { onConnect } from "y-partykit";

// deploy with npx partykit@beta deploy partykitserver.ts --name blocknote
// preview with npx partykit@beta dev partykitserver.ts
export default {
  onConnect(ws, room) {
    return onConnect(ws, room, { persist: true });
  },
} satisfies PartyKitServer;
