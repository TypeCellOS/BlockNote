"use client";

import { cn } from "@/lib/fumadocs/cn";
import { useState } from "react";
import { Tier, Tiers } from "./tiers";

type Frequency = "month" | "year";

export function PricingTiers({ tiers }: { tiers: Tier[] }) {
  const [frequency, setFrequency] = useState<Frequency>("year");

  return (
    <>
      {/* Frequency Toggle */}
      <div className="mb-10 flex items-center justify-center gap-3">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            frequency === "month" ? "text-stone-900" : "text-stone-400",
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={frequency === "year"}
          onClick={() =>
            setFrequency((f) => (f === "month" ? "year" : "month"))
          }
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            frequency === "year" ? "bg-purple-600" : "bg-stone-300",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-sm ring-0 transition-transform",
              frequency === "year" ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            frequency === "year" ? "text-stone-900" : "text-stone-400",
          )}
        >
          Yearly
        </span>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
          Save 50%
        </span>
      </div>

      <Tiers tiers={tiers} frequency={frequency} />
    </>
  );
}
