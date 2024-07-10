import type { useSession } from "next-auth/react";

// TODO: test with real data
export function getProLevel(
  session: ReturnType<typeof useSession>,
): "pro" | "starter" | "free" | undefined {
  if (session.status !== "authenticated") {
    return undefined;
  }

  const sponsorInfo = (session?.data?.user as any)?.sponsorInfo;
  if (!sponsorInfo?.isActive) {
    return "free";
  }

  return sponsorInfo.tier.monthlyPriceInDollars > 100 ? "pro" : "starter";
}
