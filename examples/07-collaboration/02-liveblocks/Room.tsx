"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { ReactNode } from "react";

const users = [
  {
    id: "1",
    name: "John Doe",
    avatar: "https://liveblocks.io/avatars/avatar-1.png",
  },
  {
    id: "2",
    name: "Alice Smith",
    avatar: "https://liveblocks.io/avatars/avatar-2.png",
  },
  {
    id: "3",
    name: "Bob Johnson",
    avatar: "https://liveblocks.io/avatars/avatar-3.png",
  },
];

export function Room({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      publicApiKey={
        "pk_dev_KuhEOKuRRciDDFTpS7qThHZmqzx7D9dKjDs7xIP21ojB2AnZ8whd9ZrV5u97zuMG"
      }
      resolveMentionSuggestions={async (args) => {
        return users
          .filter((user) =>
            user.name.toLowerCase().startsWith(args.text.toLowerCase())
          )
          .map((user) => user.id);
      }}
      resolveUsers={async (args) => {
        return args.userIds.map((id) => users.find((user) => user.id === id));
      }}>
      <RoomProvider id="my-room">
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
