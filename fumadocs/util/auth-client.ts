import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";
import type { auth } from "@/auth";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), customSessionClient<typeof auth>()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
