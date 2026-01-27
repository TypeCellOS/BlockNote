import { FAQ } from "@/app/pricing/faq";
import { Tier, Tiers } from "@/app/pricing/tiers";
import { InfiniteSlider } from "@/components/InfiniteSlider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFullMetadata } from "@/lib/getFullMetadata";
import Link from "next/link";

export const metadata = getFullMetadata({
  title: "Pricing",
  path: "/pricing",
});

const sponsors = [
  { name: "Semrush", logo: "/img/sponsors/semrush.light.png" },
  { name: "NLnet", logo: "/img/sponsors/nlnetLight.svg" },
  { name: "DINUM", logo: "/img/sponsors/dinumLight.svg" },
  { name: "ZenDiS", logo: "/img/sponsors/zendis.svg" },
  { name: "OpenProject", logo: "/img/sponsors/openproject.svg" },
  { name: "Poggio", logo: "/img/sponsors/poggioLight.svg" },
  { name: "Capitol", logo: "/img/sponsors/capitolLight.svg" },
  { name: "Twenty", logo: "/img/sponsors/twentyLight.png" },
  { name: "Deep Origin", logo: "/img/sponsors/deepOrigin.svg" },
  { name: "Krisp", logo: "/img/sponsors/krisp.svg" },
];

const tiers: Tier[] = [
  {
    id: "free",
    title: "Community",
    icon: "💚",
    tagline: "Get Started",
    description: (
      <>
        Everything you need to get started.{" "}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              delay={100}
              className="cursor-default font-medium underline decoration-stone-400 decoration-dotted decoration-1 underline-offset-4"
            >
              Liberally licensed
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] p-3 leading-normal">
              BlockNote is MPL-licensed. This is close to MIT and free for any
              use. The key difference is a "share-alike" requirement: if you
              modify BlockNote's internal files, you must share those specific
              changes.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>{" "}
        and free for any project.
      </>
    ),
    price: "Free",
    features: [
      "All blocks & UI components",

      "Drag-and-drop editing",
      "Slash commands & menus",
      "Real-time collaboration",
      "Comments",
      <span key="xl" className="text-stone-500">
        XL Packages free for OSS under GPL-3.0
      </span>,
    ],
    cta: "Get Started",
    href: "/docs",
  },
  {
    id: "business",
    title: "Business",
    icon: "⚡",
    tagline: "Go premium",
    mostPopular: true,
    badge: "Recommended",
    description:
      "Commercial license for access to advanced features and technical support.",
    price: { month: 390, year: 48 },
    features: [
      <span key="commercial" className="font-semibold text-stone-900">
        Commercial license for XL packages:
      </span>,
      <span key="ai" className="ml-4 text-stone-500">
        • AI integration
      </span>,
      <span key="layouts" className="ml-4 text-stone-500">
        • Multi-column layouts
      </span>,
      <span key="export" className="ml-4 text-stone-500">
        • Export to PDF, Docx, ODT, Email
      </span>,
      "Logo on website and repositories",
      <span key="sla">
        Standard Support (
        <Link
          href="/legal/service-level-agreement"
          className="text-purple-600 hover:underline"
        >
          see SLA
        </Link>
        )
      </span>,
    ],
    cta: "Buy now",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    icon: "🏢",
    tagline: "Sustainable partnerships",
    description: "Custom licensing, dedicated support, and design partnership.",
    price: "Custom",
    features: [
      <span key="stack" className="font-semibold text-purple-600">
        Everything in Business, plus:
      </span>,
      "Custom BlockNote feature development",
      "Private Slack channel with maintainers",
      "Onboarding and integration guidance",
      <span key="sla">
        Priority Support (
        <Link
          href="/legal/service-level-agreement"
          className="text-purple-600 hover:underline"
        >
          see SLA
        </Link>
        )
      </span>,
    ],
    href: "/about/",
    cta: "Contact us",
  },
];

export default function Pricing() {
  return (
    <div className="bg-gradient-to-b from-white via-stone-50/50 to-white text-stone-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-600">
            Pricing
          </p>
          <h1 className="mb-6 font-serif text-5xl text-stone-900 md:text-7xl">
            100% Open Source.
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Fair Pricing.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-stone-500">
            The majority of BlockNote is liberally licensed and free to use for
            any purpose. The dual-licensed XL features (like AI) are free for
            open source projects, but require a commercial license for
            closed-source applications.
          </p>
        </div>

        {/* Pricing Tiers */}
        <Tiers tiers={tiers} frequency="month" />

        {/* Social proof */}
        <div className="mt-24 w-full border-t border-stone-200 pt-16">
          <p className="mb-8 text-center text-sm font-medium text-stone-500">
            Trusted by teams building the future of collaboration
          </p>
          <InfiniteSlider gap={48} speed={30} speedOnHover={15}>
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.name}
                className="flex h-12 items-center justify-center px-4 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              >
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="h-8 max-w-[120px] object-contain"
                />
              </div>
            ))}
          </InfiniteSlider>
        </div>

        {/* FAQ */}
        <FAQ />
      </div>
    </div>
  );
}
