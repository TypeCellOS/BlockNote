import { createAuthClient } from "better-auth/react";

import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
