import { FAQ } from "@/app/pricing/faq";
import { Tier, Tiers } from "@/app/pricing/tiers";
import { SectionSubHeader } from "@/components/Headings";
import { getFullMetadata } from "@/lib/getFullMetadata";

export const metadata = getFullMetadata({
  title: "Pricing",
  path: "/pricing",
  ogImageTitle: "Pricing",
});

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
      "Best for individuals and Open Source projects looking to support BlockNote.",
    price: { month: 90, year: 24 },
    features: [
      "Access to all Pro Examples",
      "Prioritized Bug Reports on GitHub",
      "Support maintenance and new versions of our open source library",
      "XL packages only available for open source projects under GPL-3.0 or early stage startups",
    ],
  },
  {
    id: "business",
    title: "Business",
    mostPopular: true,
    description:
      // "Best for companies who need a commercial license for XL features.",

      "Best for companies that want a direct line to the team and a commercial license.",
    price: { month: 390, year: 48 },
    features: [
      <span>Commercial license for XL packages:</span>,
      "- AI integration",
      "- Multi-column layouts",
      "- Export to PDF, Docx, ODT, Email",
      "Access to all Pro Examples",
      "Prioritized Bug Reports on GitHub",
      "Support maintenance and new versions of our open source library",
      "Logo on our website and repositories",
      <span>
        Standard Support included (
        <a href="/legal/service-level-agreement">see SLA</a>)
      </span>,
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description:
      "Collaborate directly with the BlockNote team for dedicated consulting and support.",
    price: "Tailored pricing",
    features: [
      "Development of BlockNote features required for your organization",
      "Access to a private Slack channel with the maintainers",
      "Guidance on integrating BlockNote into your project",
      <span>Commercial license for XL packages:</span>,
      "- AI integration",
      "- Multi-column layouts",
      "- Export to PDF, Docx, ODT, Email",
      "Access to all Pro Examples",
      "Prioritized Bug Reports and Feature Requests on GitHub",
      "Support maintenance and new versions of our open source library",
      "Logo on our website and repositories",
      <span>
        Priority Support included (
        <a href="/legal/service-level-agreement">see SLA</a>)
      </span>,
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
          Get direct support from the maintainers, access Pro Examples
          <br /> and get your commercial license for XL Packages such as
          BlockNote AI.
          <br />
          Your subscription helps us to maintain and develop BlockNote.
        </p>
        <Tiers tiers={tiers} frequency="month" />
        <p className="mt-8 max-w-screen-md text-center text-lg text-[#00000080] dark:text-[#FFFFFFB2]">
          BlockNote is 100% open source software that organizations of all sizes
          are using to add polished editing experiences to their apps.
        </p>
        <FAQ />
      </div>
    </div>
  );
}
