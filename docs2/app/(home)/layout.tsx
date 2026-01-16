import { Footer } from "@/components/Footer";
import { HomeLayout } from "@/components/fumadocs/layout/home";
import ThemedImage from "@/components/ThemedImage";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import LogoLight from "@/public/img/logos/banner.svg";
import { LinkItemType } from "fumadocs-ui/layouts/shared";
import {
  ActivityIcon,
  BotIcon,
  BoxIcon,
  CpuIcon,
  GlobeIcon,
  LockIcon,
  RocketIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

const links: LinkItemType[] = [
  {
    text: "Docs",
    url: "/docs",
    active: "nested-url",
    items: [
      {
        text: "Overview",
        url: "/docs/overview",
      },
    ],
  },

  {
    type: "menu",
    text: "Guide",
    items: [
      {
        text: "Getting Started",
        description: "Learn to use Fumadocs",
        url: "/docs",
      },
    ],
  },
  {
    type: "menu",
    text: "Products",
    items: [
      {
        groupName: "AI Cloud",
        text: "v0",
        description: "Build applications with AI",
        url: "/docs/ai/v0",
        icon: <BoxIcon className="size-4" />,
      },
      {
        groupName: "AI Cloud",
        text: "AI SDK",
        description: "The AI Toolkit for TypeScript",
        url: "/docs/ai/sdk",
        icon: <BoxIcon className="size-4" />,
      },
      {
        groupName: "AI Cloud",
        text: "AI Gateway",
        description: "One endpoint, all your models",
        url: "/docs/ai/gateway",
        icon: <SparklesIcon className="size-4" />,
      },
      {
        groupName: "AI Cloud",
        text: "Vercel Agent",
        description: "An agent that knows your stack",
        url: "/docs/ai/agent",
        icon: <BotIcon className="size-4" />,
      },
      {
        groupName: "Core Platform",
        text: "CI/CD",
        description: "Helping teams ship 6x faster",
        url: "/docs/core/cicd",
        icon: <RocketIcon className="size-4" />,
      },
      {
        groupName: "Core Platform",
        text: "Content Delivery",
        description: "Fast, scalable, and reliable",
        url: "/docs/core/cdn",
        icon: <GlobeIcon className="size-4" />,
      },
      {
        groupName: "Core Platform",
        text: "Fluid Compute",
        description: "Servers, in serverless form",
        url: "/docs/core/compute",
        icon: <CpuIcon className="size-4" />,
      },
      {
        groupName: "Core Platform",
        text: "Observability",
        description: "Trace every step",
        url: "/docs/core/observability",
        icon: <ActivityIcon className="size-4" />,
      },
      {
        groupName: "Security",
        text: "Bot Management",
        description: "Scalable bot protection",
        url: "/docs/security/bot-management",
        icon: <BotIcon className="size-4" />,
      },
      {
        groupName: "Security",
        text: "Platform Security",
        description: "DDoS Protection, Firewall",
        url: "/docs/security/platform",
        icon: <ShieldCheckIcon className="size-4" />,
      },
      {
        groupName: "Security",
        text: "Web Application Firewall",
        description: "Granular, custom protection",
        url: "/docs/security/waf",
        icon: <LockIcon className="size-4" />,
      },
    ],
  },
  {
    text: "AI",
    url: "/docs/features/ai",
    active: "nested-url",
  },
];

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <>
      <HomeLayout
        links={links}
        nav={{
          enabled: true,
          title: (
            <ThemedImage
              src={{ light: LogoLight, dark: LogoDark }}
              alt="BlockNote"
              className="w-40"
            />
          ),
        }}
      >
        {children}
      </HomeLayout>
      <Footer />
    </>
  );
}
