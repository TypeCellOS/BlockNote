import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

const EXPIRY_PERIOD_MILLISECONDS = 60 * 60 * 1000; // 1 hour

// deploy with npx partykit deploy partykitserver.ts --name blocknote
// preview with npx partykit dev partykitserver.ts
export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!

    return onConnect(conn, this.party, { persist: false, gc: true });
  }

  async onMessage(message: string) {
    // const data = JSON.parse(message);
    // do something, and save to storage
    // await this.party.storage.put(data.id, data);
    // console.log("on message");
    await this.party.storage.setAlarm(Date.now() + EXPIRY_PERIOD_MILLISECONDS);
  }

  async onAlarm() {
    // clear all storage in this room
    console.log("alarm, delete storage");
    await this.party.storage.deleteAll();
  }
}

Server satisfies Party.Worker;
