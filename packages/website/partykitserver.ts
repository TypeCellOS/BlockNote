import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

// deploy with npx partykit deploy partykitserver.ts --name blocknote
// preview with npx partykit dev partykitserver.ts
export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!

    return onConnect(conn, this.party, { persist: false, gc: true });
  }
}

Server satisfies Party.Worker;
