"use client";
import { InfiniteSlider } from "@/components/InfiniteSlider";
import Link from "next/link";
import React from "react";

// ============================================
// DESIGN A: Three-tier pricing cards
// ============================================
const tiersA = [
  {
    name: "Free",
    tagline: "For everyone",
    icon: "💚",
    description:
      "The complete BlockNote editor, including XL packages under GPL-3.0 for open source projects.",
    features: [
      "All blocks & UI components",
      "Real-time collaboration",
      "Comments & suggestions",
      "AI integration",
      "Multi-column layouts",
      "Export to PDF, Docx, ODT",
    ],
    license: "MIT + GPL-3.0",
    highlight: false,
  },
  {
    name: "Pro",
    tagline: "For commercial use",
    icon: "⚡",
    description:
      "Commercial license for XL packages in closed-source projects.",
    features: [
      "AI integration",
      "Multi-column layouts",
      "Export to PDF, Docx, ODT, Email",
      "Startup discounts available",
    ],
    license: "Commercial License",
    highlight: true,
  },
  {
    name: "Enterprise",
    tagline: "For teams at scale",
    icon: "🏢",
    description: "Priority support, SLAs, and design partnership.",
    features: [
      "Priority support & SLAs",
      "Design partnership",
      "Custom development",
      "Dedicated onboarding",
    ],
    license: "Custom terms",
    highlight: false,
  },
];

const PricingDesignA: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-stone-100 to-stone-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            Design A — Three Tiers
          </span>
        </div>

        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-600">
            Pricing
          </p>
          <h2 className="mb-6 font-serif text-4xl text-stone-900 md:text-5xl">
            100% open source. Fair pricing.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-stone-500">
            Everything is open source. Use it free under GPL-3.0, or get a
            commercial license for closed-source projects.
          </p>
        </div>

        {/* Tiers */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {tiersA.map((tier, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border p-8 transition-all ${
                tier.highlight
                  ? "border-purple-300 bg-white shadow-xl shadow-purple-500/10"
                  : "border-stone-200 bg-white"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Commercial
                  </span>
                </div>
              )}
              <div className="mb-4 text-3xl">{tier.icon}</div>
              <h3 className="mb-1 text-xl font-semibold text-stone-900">
                {tier.name}
              </h3>
              <p className="mb-4 text-sm font-medium text-purple-600">
                {tier.tagline}
              </p>
              <p className="mb-6 text-sm leading-relaxed text-stone-500">
                {tier.description}
              </p>
              <ul className="mb-6 space-y-3">
                {tier.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-start gap-2 text-sm text-stone-600"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium text-stone-400">
                {tier.license}
              </p>
            </div>
          ))}
        </div>

        {/* No limits note */}
        <p className="mb-12 text-center text-sm text-stone-500">
          No limits on documents, users, or features across all plans.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-4 font-medium text-white transition-all hover:bg-purple-700"
          >
            <span>View Pricing</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
          <Link
            href="/docs/licensing"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-8 py-4 font-medium text-stone-700 transition-all hover:border-stone-300"
          >
            Licensing FAQ
          </Link>
        </div>
      </div>
    </section>
  );
};

// ============================================
// DESIGN B: Simple two-part explainer
// ============================================
const sponsors = [
  {
    name: "Semrush",
    logo: (
      <>
        <img
          src="/img/sponsors/semrush.light.png"
          alt="Semrush"
          className="h-8 dark:hidden"
        />
        <img
          src="/img/sponsors/semrush.dark.png"
          alt="Semrush"
          className="hidden h-8 dark:block"
        />
      </>
    ),
  },
  {
    name: "NLnet",
    logo: (
      <>
        <img
          src="/img/sponsors/nlnetLight.svg"
          alt="NLnet"
          className="h-9 dark:hidden"
        />
        <img
          src="/img/sponsors/nlnetDark.svg"
          alt="NLnet"
          className="hidden h-9 dark:block"
        />
      </>
    ),
  },
  {
    name: "DINUM",
    logo: (
      <>
        <img
          src="/img/sponsors/dinumLight.svg"
          alt="DINUM"
          className="h-8 dark:hidden"
        />
        <img
          src="/img/sponsors/dinumDark.svg"
          alt="DINUM"
          className="hidden h-8 dark:block"
        />
      </>
    ),
  },
  {
    name: "ZenDiS",
    logo: <img src="/img/sponsors/zendis.svg" alt="ZenDiS" className="h-8" />,
  },
  {
    name: "OpenProject",
    logo: (
      <img
        src="/img/sponsors/openproject.svg"
        alt="OpenProject"
        className="h-8"
      />
    ),
  },
  {
    name: "Poggio",
    logo: (
      <>
        <img
          src="/img/sponsors/poggioLight.svg"
          alt="Poggio"
          className="h-7 dark:hidden"
        />
        <img
          src="/img/sponsors/poggioDark.svg"
          alt="Poggio"
          className="hidden h-7 dark:block"
        />
      </>
    ),
  },
  {
    name: "Capitol",
    logo: (
      <>
        <img
          src="/img/sponsors/capitolLight.svg"
          alt="Capitol"
          className="h-7 dark:hidden"
        />
        <img
          src="/img/sponsors/capitolDark.svg"
          alt="Capitol"
          className="hidden h-7 dark:block"
        />
      </>
    ),
  },
  {
    name: "Twenty",
    logo: (
      <>
        <img
          src="/img/sponsors/twentyLight.png"
          alt="Twenty"
          className="h-7 dark:hidden"
        />
        <img
          src="/img/sponsors/twentyDark.png"
          alt="Twenty"
          className="hidden h-7 dark:block"
        />
      </>
    ),
  },
  {
    name: "Deep Origin",
    logo: (
      <img
        src="/img/sponsors/deepOrigin.svg"
        alt="Deep Origin"
        className="h-7"
      />
    ),
  },
  {
    name: "Krisp",
    logo: <img src="/img/sponsors/krisp.svg" alt="Krisp" className="h-7" />,
  },
  {
    name: "Claimer",
    logo: <img src="/img/sponsors/claimer.svg" alt="Claimer" className="h-7" />,
  },
  {
    name: "Atlas",
    logo: <img src="/img/sponsors/atlas.svg" alt="Atlas" className="h-7" />,
  },
  {
    name: "Juma",
    logo: <img src="/img/sponsors/juma.svg" alt="Juma" className="h-7" />,
  },
  {
    name: "Atuin",
    logo: <img src="/img/sponsors/atuin.png" alt="Atuin" className="h-9" />,
  },
  {
    name: "Cella",
    logo: <img src="/img/sponsors/cella.png" alt="Cella" className="h-7" />,
  },
  {
    name: "Illumi",
    logo: <img src="/img/sponsors/illumi.png" alt="Illumi" className="h-7" />,
  },
  {
    name: "Agree",
    logo: <img src="/img/sponsors/agree.png" alt="Agree" className="h-9" />,
  },
];

const PricingDesignB: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-white to-stone-50 py-24">
      <div className="mx-auto max-w-4xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-600">
            Transparent pricing
          </p>
          <h2 className="mb-6 font-serif text-4xl text-stone-900 md:text-5xl">
            Subscribe to BlockNote XL.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-stone-500">
            BlockNote is 100% open source. Here's how licensing works.
          </p>
        </div>

        {/* Two-part explainer */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {/* Core */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">💚</span>
              <h3 className="text-xl font-semibold text-stone-900">
                Core Editor
              </h3>
            </div>
            <p className="mb-6 text-stone-600">
              The majority of BlockNote (including all blocks, real-time
              collaboration, comments, and UI components) are liberally
              licensed.
            </p>
            <p className="mb-6 text-stone-600">
              Free to use in any project; personal, open source, or commercial.
            </p>
            <p className="text-sm font-medium text-green-600">
              ✓ Free for everyone
            </p>
          </div>

          {/* XL */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xl font-semibold text-stone-900">
                XL Packages
              </h3>
            </div>
            <p className="mb-4 text-stone-600">
              Advanced features like <strong>AI integration</strong>,{" "}
              <strong>PDF / Word / ODT exports</strong>, and{" "}
              <strong>multi-column layouts</strong>.
            </p>
            <p className="mb-6 text-stone-600">
              Free for open source projects under GPL-3.0. Closed source
              projects require a subscription.
            </p>
            <p className="text-sm font-medium text-purple-600">
              ✓ Free for open source
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mb-16 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-4 font-medium text-white transition-all hover:bg-purple-700"
          >
            <span>View Pricing</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Sponsors */}
        <div className="border-t border-stone-200 pt-12 dark:border-stone-800">
          <p className="mb-8 text-center text-sm font-medium text-stone-500">
            Thanks to our supporters for helping us build sustainable open
            source software.
          </p>
          <InfiniteSlider gap={48} speed={30} speedOnHover={15}>
            {sponsors.map((sponsor, index) => (
              <div
                key={index}
                className="flex h-16 items-center justify-center px-4 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              >
                {sponsor.logo ? (
                  sponsor.logo
                ) : (
                  <span className="text-sm font-medium text-stone-400">
                    {sponsor.name}
                  </span>
                )}
              </div>
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
};

// ============================================
// Export both for comparison
// ============================================
export const Pricing: React.FC = () => {
  return (
    <>
      {/* <PricingDesignA /> */}
      <PricingDesignB />
    </>
  );
};
