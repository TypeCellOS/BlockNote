import type { useSession } from "next-auth/react";

export function getProLevel(
  session: ReturnType<typeof useSession>,
): "business" | "starter" | "free" | undefined {
  if (session.status !== "authenticated") {
    return undefined;
  }

  const sponsorInfo = (session?.data?.user as any)?.sponsorInfo;
  if (!sponsorInfo?.isActive) {
    return "free";
  }

  return sponsorInfo.tier.monthlyPriceInDollars > 100 ? "business" : "starter";
}
