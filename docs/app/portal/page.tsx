"use client";

import { useSession } from "@/util/auth-client";

// Just shows session info
export default function Me() {
  const { data: session } = useSession();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}
