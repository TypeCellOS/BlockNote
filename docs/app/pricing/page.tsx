import { SectionSubHeader } from "@/components/Headings";
import { FAQ } from "@/app/pricing/faq";
import { Tiers, Tier } from "@/app/pricing/tiers";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BlockNote - Pricing",
  openGraph: {
    images: "/api/og?title=Pricing",
  },
};

const tiers: Tier[] = [
  // {
  //   id: "tier-free",
  //   title: "Community",
  //   description: "Everything necessary to get started for individuals and non-commercial projects.",
  //   price: "Free",
  //   features: [
  //     "Use BlockNote for free (open source license)",
  //     "Community Discord for help & feedback",
  //   ],
  //   href: "/docs/",
  // },
  {
    id: "starter",
    mostPopular: false,
    title: "Starter",
    description:
      "Best for companies and organizations building products with BlockNote.",
    price: { month: 90, year: 24 },
    features: [
      "Access to all Pro Examples",
      "Prioritized Bug Reports on GitHub",
      "Keep the open source library running and maintained",
      "XL packages available for open source projects under AGPL-3.0",
    ],
  },
  {
    id: "business",
    title: "Business",
    mostPopular: true,
    description: "Best for companies that want a direct line to the team.",
    price: { month: 390, year: 48 },
    features: [
      "Commercial license for XL packages:",
      "XL: Multi-column layouts",
      "XL: Export to PDF, Docx",
      "Access to all Pro Examples",
      "Prioritized Bug Reports on GitHub",
      "Keep the open source library running and maintained",
      "Logo on our website and repositories",
      "Access to a private Discord channel with the maintainers",
      "Up to 2 hours of individual support per month",
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description:
      "Collaborate directly with the BlockNote team on integrating and extending the editor.",
    price: "Tailored pricing",
    features: [
      "Access to all Pro Examples",
      "Prioritized Bug Reports and Feature Requests on GitHub",
      "Keep the open source library running and maintained",
      "Access to a private Discord or Slack channel with the maintainers",
      "Guidance on integrating BlockNote into your project",
      "Development of BlockNote features required for your organization",
      "Dedicated consulting and support",
    ],
    href: "/about/",
  },
];

export default function Pricing() {
  return (
    <div className="flex flex-col items-center py-16 sm:py-16">
      <div className="flex max-w-screen-xl flex-col items-center px-6 lg:px-8">
        <h2 className="leading-20 mb-2 max-w-6xl text-center text-5xl font-bold tracking-tight text-indigo-600 md:text-7xl">
          BlockNote Pro
        </h2>
        <SectionSubHeader>Upgrade your BlockNote experience</SectionSubHeader>
        <p className="mt-8 max-w-screen-md text-center text-lg text-[#00000080] dark:text-[#FFFFFFB2]">
          Your subscription helps maintain and develop BlockNote while giving
          you access to direct support, priority features, and Pro Examples.
        </p>
        <Tiers tiers={tiers} frequency="month" />
        <p className="mt-8 max-w-screen-md text-center text-lg text-[#00000080] dark:text-[#FFFFFFB2]">
          Thanks for checking out BlockNote Pro! <br /> BlockNote is free and
          open source software that organizations of all sizes are using to add
          polished editing experiences to their apps.
        </p>
        <FAQ />
      </div>
    </div>
  );
}
