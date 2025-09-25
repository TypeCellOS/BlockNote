"use client";
import { authClient, useSession } from "@/util/auth-client";
import { CheckIcon } from "@heroicons/react/20/solid";
import { track } from "@vercel/analytics";
import classNames from "classnames";
import React from "react";
import * as Sentry from "@sentry/nextjs";

type Frequency = "month" | "year";

export type Tier = {
  id: string;
  mostPopular?: boolean;
  title: string;
  description: string;
  price: Record<Frequency, number> | string;
  features: React.ReactNode[];
  href?: string;
};

function TierTitle({ tier }: { tier: Tier }) {
  return (
    <h3
      id={tier.id}
      className={classNames(
        tier.mostPopular && "text-indigo-600",
        "text-3xl font-semibold leading-8",
      )}
    >
      {tier.title}
    </h3>
  );
}

function TierPrice({ tier, frequency }: { tier: Tier; frequency: Frequency }) {
  return (
    <p className="text-md text-fd-muted-foreground font-semibold">
      {typeof tier.price === "string"
        ? tier.price
        : `$${tier.price[frequency]} / ${frequency}`}
    </p>
  );
}

function TierHeader({ tier, frequency }: { tier: Tier; frequency: Frequency }) {
  return (
    <div className="flex flex-col justify-end">
      <TierTitle tier={tier} />
      <TierPrice tier={tier} frequency={frequency} />
    </div>
  );
}

function TierDescription({ tier }: { tier: Tier }) {
  return <p className="text-md mt-4 leading-6 lg:h-24">{tier.description}</p>;
}

function TierCTAButton({ tier }: { tier: Tier }) {
  const { data: session } = useSession();
  let text = "Sign up";

  if (session) {
    if (session.planType === "free") {
      text = "Buy now";
    } else {
      text =
        session.planType === tier.id
          ? "Manage subscription"
          : "Update subscription";
    }
  }
  return (
    <a
      onClick={async (e) => {
        // This event is deprecated, but we keep it to use as a baseline for analytics
        track("Signup", { tier: tier.id });

        if (!session) {
          Sentry.captureEvent({
            message: "click-pricing-signup",
            level: "info",
            extra: {
              tier: tier.id,
            },
          });
          track("click-pricing-signup", { tier: tier.id });
          return;
        }

        if (session.planType === "free") {
          Sentry.captureEvent({
            message: "click-pricing-buy-now",
            level: "info",
            extra: {
              tier: tier.id,
            },
          });
          track("click-pricing-buy-now", { tier: tier.id });
          e.preventDefault();
          e.stopPropagation();
          await authClient.checkout({
            slug: tier.id,
          });
        } else {
          if (session.planType === tier.id) {
            Sentry.captureEvent({
              message: "click-pricing-manage-subscription",
              level: "info",
              extra: {
                tier: tier.id,
              },
            });
            track("click-pricing-manage-subscription", { tier: tier.id });
          } else {
            Sentry.captureEvent({
              message: "click-pricing-update-subscription",
              level: "info",
              extra: {
                tier: tier.id,
              },
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
      className={classNames(
        tier.mostPopular
          ? "text-fd-background dark:text-fd-foreground bg-indigo-600 shadow-sm hover:bg-indigo-500"
          : "text-indigo-600 ring-1 ring-inset ring-indigo-600 hover:text-indigo-500 hover:ring-indigo-500",
        "mt-8 block cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
      )}
    >
      {tier.id === "enterprise" ? "Get in touch" : text}
    </a>
  );
}

function TierFeature({ feature }: { feature: React.ReactNode }) {
  return (
    <li className="prose flex gap-x-3 text-sm">
      <CheckIcon
        aria-hidden="true"
        className="h-6 w-5 flex-none text-indigo-600"
      />
      {feature}
    </li>
  );
}

function TierFeatures({ tier }: { tier: Tier }) {
  return (
    <ul className="mt-8 space-y-3 text-sm leading-6 xl:mt-10">
      {tier.features.map((feature, index) => (
        <TierFeature key={index} feature={feature} />
      ))}
    </ul>
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
    <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-4 lg:mx-0 lg:max-w-none lg:grid-cols-3">
      {tiers.map((tier) => (
        <div
          key={tier.id}
          className={classNames(
            tier.mostPopular ? "ring-indigo-600" : "ring-fd-border",
            "bg-fd-accent rounded-md p-8 ring-2 xl:p-10",
          )}
        >
          <TierHeader tier={tier} frequency={frequency} />
          <TierDescription tier={tier} />
          <TierCTAButton tier={tier} />
          <TierFeatures tier={tier} />
        </div>
      ))}
    </div>
  );
}
