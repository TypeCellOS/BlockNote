import type { auth } from "@/lib/auth";
import { polarClient } from "@polar-sh/better-auth";
import {
  customSessionClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    customSessionClient<typeof auth>(),
    polarClient(),
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;
