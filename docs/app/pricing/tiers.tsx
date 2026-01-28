"use client";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/fumadocs/cn";
import * as Sentry from "@sentry/nextjs";
import { track } from "@vercel/analytics";
import { CheckIcon } from "lucide-react";
import React from "react";

type Frequency = "month" | "year";

export type Tier = {
  id: string;
  mostPopular?: boolean;
  theme?: "green" | "purple" | "default";
  badge?: string;
  icon?: string;
  title: string;
  tagline?: string;
  description: React.ReactNode;
  price: Record<Frequency, number> | string;
  features: React.ReactNode[];
  href?: string;
  cta?: "get-started" | "buy" | "contact";
};

function TierCTAButton({ tier }: { tier: Tier }) {
  const { data: session } = useSession();
  let text =
    tier.cta === "get-started"
      ? "Get Started"
      : tier.cta === "buy"
        ? "Sign up"
        : tier.cta === "contact"
          ? "Contact us"
          : "Sign up";

  if (session && tier.cta === "buy") {
    if (session.planType === "free") {
      text = "Buy now";
    } else {
      text =
        session.planType === tier.id
          ? "Manage subscription"
          : "Update subscription";
    }
  }

  // Theme-based button styles
  const isGreen = tier.theme === "green";
  const isPurple = tier.mostPopular; // Keep purple for most popular

  const buttonClasses = cn(
    "group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-center text-sm font-semibold transition-all shadow-sm",
    isPurple &&
      "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30",
    isGreen &&
      "bg-white border-2 border-green-200 text-green-700 hover:border-green-300 hover:shadow-md hover:shadow-green-500/10",
    !isPurple &&
      !isGreen &&
      "bg-white border border-stone-300 text-stone-900 hover:border-purple-300 hover:text-purple-600",
  );

  return (
    <a
      onClick={async (e) => {
        if (tier.cta !== "buy") {
          return;
        }

        track("Signup", { tier: tier.id });
        // ... rest of analytic logic kept simple for brevity in replacement,
        // in real implementation we keep the existing logic.
        // Re-injecting existing analytics logic below to ensure no regression.
        if (!session) {
          Sentry.captureEvent({
            message: "click-pricing-signup",
            level: "info",
            extra: { tier: tier.id },
          });
          track("click-pricing-signup", { tier: tier.id });
          return;
        }

        if (session.planType === "free") {
          Sentry.captureEvent({
            message: "click-pricing-buy-now",
            level: "info",
            extra: { tier: tier.id },
          });
          track("click-pricing-buy-now", { tier: tier.id });
          e.preventDefault();
          e.stopPropagation();
          await authClient.checkout({ slug: tier.id });
        } else {
          if (session.planType === tier.id) {
            Sentry.captureEvent({
              message: "click-pricing-manage-subscription",
              level: "info",
              extra: { tier: tier.id },
            });
            track("click-pricing-manage-subscription", { tier: tier.id });
          } else {
            Sentry.captureEvent({
              message: "click-pricing-update-subscription",
              level: "info",
              extra: { tier: tier.id },
            });
            track("click-pricing-update-subscription", { tier: tier.id });
          }
          e.preventDefault();
          e.stopPropagation();
          await authClient.customer.portal();
        }
      }}
      href={tier.href ?? (session ? undefined : "/signup")}
      aria-describedby={tier.id}
      className={buttonClasses}
    >
      {text}
      <span
        className={cn(
          "transition-transform group-hover:translate-x-0.5",
          tier.mostPopular ? "text-white/80" : "text-stone-400",
        )}
      >
        →
      </span>
    </a>
  );
}

function TierFeature({ feature }: { feature: React.ReactNode }) {
  const isSubFeature =
    typeof feature === "object" &&
    feature !== null &&
    "props" in feature &&
    (feature as { props?: { className?: string } }).props?.className?.includes(
      "ml-4",
    );

  return (
    <li
      className={cn(
        "flex items-start gap-3 text-sm",
        isSubFeature ? "text-stone-500" : "text-stone-600",
      )}
    >
      {!isSubFeature && (
        <div className="flex h-5 items-center">
          <CheckIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
        </div>
      )}
      <span className={isSubFeature ? "ml-7" : ""}>{feature}</span>
    </li>
  );
}

export function Tiers({
  tiers,
  frequency,
}: {
  tiers: Tier[];
  frequency: Frequency;
}) {
  return (
    <div className="grid w-full max-w-7xl gap-6 md:grid-cols-3">
      {tiers.map((tier) => {
        const isGreen = tier.theme === "green";
        const isPurple = tier.mostPopular;

        return (
          <div
            key={tier.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 transition-all duration-300",
              isPurple
                ? "border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/20 shadow-xl shadow-purple-500/10 md:z-10 md:scale-105"
                : isGreen
                  ? "border-green-200 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 hover:shadow-lg hover:shadow-green-500/5"
                  : "border-stone-200 bg-white hover:border-purple-100 hover:shadow-lg hover:shadow-purple-500/5",
            )}
          >
            {/* Popular badge */}
            {tier.mostPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {tier.badge ?? "Most Popular"}
                </span>
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              {tier.icon && <div className="mb-3 text-3xl">{tier.icon}</div>}
              <h3 className="font-serif text-2xl text-stone-900">
                {tier.title}
              </h3>
              {tier.tagline && (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-purple-600">
                  {tier.tagline}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              {typeof tier.price === "string" ? (
                <span className="text-3xl font-bold text-stone-900">
                  {tier.price}
                </span>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-stone-900">
                    ${tier.price[frequency]}
                  </span>
                  <span className="text-sm font-medium text-stone-400">
                    /{frequency}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="mb-6 min-h-[48px] text-sm leading-relaxed text-stone-500">
              {tier.description}
            </p>

            {/* CTA */}
            <div className="mb-6">
              <TierCTAButton tier={tier} />
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3">
              {tier.features.map((feature, index) => (
                <TierFeature key={index} feature={feature} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
