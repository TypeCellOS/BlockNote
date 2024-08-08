import { CheckIcon } from "@heroicons/react/20/solid";
import { track } from "@vercel/analytics";
import classNames from "classnames";

type Frequency = "month" | "year";

type Tier = {
  id: string;
  mostPopular?: boolean;
  title: string;
  description: string;
  price: Record<Frequency, number> | string;
  features: string[];
} & ({ githubTierId: string } | { href: string });

const gitHubSponsorBaseHref =
  "https://github.com/sponsors/YousefED/sponsorships?sponsor=YousefED&tier_id=";

function TierTitle({ tier }: { tier: Tier }) {
  return (
    <h3
      id={tier.id}
      className={classNames(
        tier.mostPopular && "text-indigo-600",
        "text-2xl font-semibold leading-8",
      )}>
      {tier.title}
    </h3>
  );
}

function TierPrice({ tier, frequency }: { tier: Tier; frequency: Frequency }) {
  return (
    <p className="text-md font-semibold text-[#00000080] dark:text-[#FFFFFFB2]">
      {typeof tier.price === "string"
        ? tier.price
        : `$${tier.price[frequency]} per ${frequency}`}
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
  return <p className="mt-4 text-sm leading-6 lg:h-24">{tier.description}</p>;
}

function TierCTAButton({ tier }: { tier: Tier }) {
  return (
    <a
      href={
        "href" in tier ? tier.href : gitHubSponsorBaseHref + tier.githubTierId
      }
      aria-describedby={tier.id}
      className={classNames(
        tier.mostPopular
          ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
          : "text-indigo-600 ring-1 ring-inset ring-indigo-600 hover:text-indigo-500 hover:ring-indigo-500",
        "mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
      )}
      onClick={() => {
        track("Signup", { tier: tier.id });
      }}>
      {tier.id === "tier-free"
        ? "Get started"
        : tier.id === "tier-enterprise"
          ? "Get in touch"
          : "Sign up"}
    </a>
  );
}

function TierFeature({ feature }: { feature: string }) {
  return (
    <li className="flex gap-x-3">
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
      {tier.features.map((feature) => (
        <TierFeature key={feature} feature={feature} />
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
            tier.mostPopular
              ? "ring-indigo-600"
              : "ring-gray-200 dark:ring-gray-800",
            "rounded-md p-8 ring-2 xl:p-10",
          )}>
          <TierHeader tier={tier} frequency={frequency} />
          <TierDescription tier={tier} />
          <TierCTAButton tier={tier} />
          <TierFeatures tier={tier} />
        </div>
      ))}
    </div>
  );
}
