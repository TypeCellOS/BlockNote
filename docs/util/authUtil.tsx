import type { useSession } from "next-auth/react";

// TODO: test with real data
export function getProLevel(
  session: ReturnType<typeof useSession>,
): "pro" | "starter" | undefined {
  if (session.status !== "authenticated") {
    return undefined;
  }

  const sponsorInfo = (session?.data?.user as any)?.sponsorInfo;
  if (!sponsorInfo?.isActive) {
    return undefined;
  }

  return sponsorInfo.tier.monthlyPriceInDollars > 100 ? "pro" : "starter";
}

export function hasAccessToProExamples(session: ReturnType<typeof useSession>) {
  return getProLevel(session) !== undefined;
}
