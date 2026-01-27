import { AuthNavButton } from "@/components/AuthNavButton";
import ThemedImage from "@/components/ThemedImage";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import LogoLight from "@/public/img/logos/banner.svg";
import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared";
import { FaGithub } from "react-icons/fa6";
// import { LinkItemType } from "@/components/fumadocs/layout/link-item";
// import {
//   ActivityIcon,
//   BotIcon,
//   BoxIcon,
//   CpuIcon,
//   GlobeIcon,
//   LockIcon,
//   RocketIcon,
//   ShieldCheckIcon,
//   SparklesIcon,
// } from "lucide-react";

// const links: LinkItemType[] = [
//   {
//     text: "Docs",
//     url: "/docs",
//     active: "nested-url",
//     items: [
//       {
//         text: "Overview",
//         url: "/docs/overview",
//       },
//     ],
//   },

//   {
//     type: "menu",
//     text: "Product",
//     items: [
//       {
//         groupName: "Platform",
//         text: "Editor Platform",
//         description: "Modern block-based editor",
//         url: "/product/platform/editor",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "Platform",
//         text: "Block Model",
//         description: "Composable, structured content",
//         url: "/product/platform/block-model",
//         icon: <SparklesIcon className="size-4" />,
//       },
//       {
//         groupName: "Platform",
//         text: "Real-time Collaboration",
//         description: "Multi-user editing with presence",
//         url: "/product/platform/collaboration",
//         icon: <ActivityIcon className="size-4" />,
//       },
//       {
//         groupName: "Platform",
//         text: "Extensibility",
//         description: "Custom blocks, plugins, and APIs",
//         url: "/product/platform/extensibility",
//         icon: <CpuIcon className="size-4" />,
//       },
//       {
//         groupName: "Platform",
//         text: "Performance & Scalability",
//         description: "Reliable at any scale",
//         url: "/product/platform/performance",
//         icon: <GlobeIcon className="size-4" />,
//       },
//       {
//         groupName: "Features",
//         text: "Custom Blocks",
//         description: "Extend functionality with your own blocks",
//         url: "/product/features/custom-blocks",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "Features",
//         text: "Collaborative Editing",
//         description: "Edit documents with your team in real time",
//         url: "/product/features/collaboration",
//         icon: <ActivityIcon className="size-4" />,
//       },
//       {
//         groupName: "Features",
//         text: "Comments & Mentions",
//         description: "Streamline team communication in context",
//         url: "/product/features/comments",
//         icon: <BotIcon className="size-4" />,
//       },
//       {
//         groupName: "Features",
//         text: "Version History",
//         description: "Track changes and revert safely",
//         url: "/product/features/version-history",
//         icon: <RocketIcon className="size-4" />,
//       },
//       {
//         groupName: "Integrations",
//         text: "Yjs Collaboration Engine",
//         description: "Reliable CRDT-based synchronization",
//         url: "/product/integrations/yjs",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "Integrations",
//         text: "ProseMirror Ecosystem",
//         description: "Interoperable editor architecture",
//         url: "/product/integrations/prosemirror",
//         icon: <SparklesIcon className="size-4" />,
//       },
//       {
//         groupName: "Integrations",
//         text: "Framework Integrations",
//         description: "React, Next.js, and more",
//         url: "/product/integrations/frameworks",
//         icon: <GlobeIcon className="size-4" />,
//       },
//       {
//         groupName: "Integrations",
//         text: "API & SDKs",
//         description: "Extend and automate workflows",
//         url: "/product/integrations/api-sdk",
//         icon: <CpuIcon className="size-4" />,
//       },
//     ],
//   },

//   {
//     type: "menu",
//     text: "Solutions",
//     items: [
//       {
//         groupName: "Use Cases",
//         text: "Knowledge Bases",
//         description: "Centralize and structure knowledge",
//         url: "/solutions/use-cases/knowledge-bases",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "Use Cases",
//         text: "Collaborative Documents",
//         description: "Team-driven document workflows",
//         url: "/solutions/use-cases/collaborative-docs",
//         icon: <ActivityIcon className="size-4" />,
//       },
//       {
//         groupName: "Use Cases",
//         text: "Internal Tools",
//         description: "Custom apps built on BlockNote",
//         url: "/solutions/use-cases/internal-tools",
//         icon: <CpuIcon className="size-4" />,
//       },
//       {
//         groupName: "Industries",
//         text: "Public Sector",
//         description: "Digital autonomy & EU collaborations",
//         url: "/solutions/industries/public-sector",
//         icon: <ShieldCheckIcon className="size-4" />,
//       },
//       {
//         groupName: "Industries",
//         text: "Enterprise Teams",
//         description: "Custom collaboration & consulting",
//         url: "/solutions/industries/enterprise",
//         icon: <LockIcon className="size-4" />,
//       },
//       {
//         groupName: "Industries",
//         text: "Startups & Scaleups",
//         description: "Flexible partnerships for growth-stage companies",
//         url: "/solutions/industries/startups",
//         icon: <RocketIcon className="size-4" />,
//       },
//     ],
//   },

//   {
//     type: "menu",
//     text: "AI",
//     items: [
//       {
//         groupName: "AI Features",
//         text: "AI Writing Assistance",
//         description: "Content generation powered by AI",
//         url: "/ai/features/writing-assistance",
//         icon: <SparklesIcon className="size-4" />,
//       },
//       {
//         groupName: "AI Features",
//         text: "Smart Blocks",
//         description: "Context-aware content blocks",
//         url: "/ai/features/smart-blocks",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "AI Use Cases",
//         text: "Knowledge Capture",
//         description: "Automate knowledge aggregation",
//         url: "/ai/use-cases/knowledge-capture",
//         icon: <GlobeIcon className="size-4" />,
//       },
//       {
//         groupName: "AI Use Cases",
//         text: "Content Drafting",
//         description: "Draft documents efficiently",
//         url: "/ai/use-cases/content-drafting",
//         icon: <ActivityIcon className="size-4" />,
//       },
//       {
//         groupName: "AI Platform",
//         text: "Model-Agnostic Design",
//         description: "Flexible AI integration",
//         url: "/ai/platform/model-agnostic",
//         icon: <CpuIcon className="size-4" />,
//       },
//       {
//         groupName: "AI Platform",
//         text: "Data Privacy & Security",
//         description: "Enterprise-grade compliance",
//         url: "/ai/platform/privacy-security",
//         icon: <ShieldCheckIcon className="size-4" />,
//       },
//     ],
//   },

//   {
//     type: "menu",
//     text: "Resources",
//     items: [
//       {
//         groupName: "Documentation & Developer Tools",
//         text: "Get Started",
//         description: "Learn how to use BlockNote",
//         url: "/resources/get-started",
//         icon: <RocketIcon className="size-4" />,
//       },
//       {
//         groupName: "Documentation & Developer Tools",
//         text: "Installation",
//         description: "Set up BlockNote in your environment",
//         url: "/resources/installation",
//         icon: <GlobeIcon className="size-4" />,
//       },
//       {
//         groupName: "Documentation & Developer Tools",
//         text: "Guides",
//         description: "In-depth tutorials and examples",
//         url: "/resources/guides",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "Documentation & Developer Tools",
//         text: "API Reference",
//         description: "Technical documentation for developers",
//         url: "/resources/api",
//         icon: <CpuIcon className="size-4" />,
//       },
//       {
//         groupName: "Learning & Proof",
//         text: "Case Studies",
//         description: "Real-world use cases of BlockNote",
//         url: "/resources/case-studies",
//         icon: <ActivityIcon className="size-4" />,
//       },
//       {
//         groupName: "Learning & Proof",
//         text: "Open-Source Deployments",
//         description: "Examples of OSS projects using BlockNote",
//         url: "/resources/oss-deployments",
//         icon: <BoxIcon className="size-4" />,
//       },
//       {
//         groupName: "Learning & Proof",
//         text: "Comparisons",
//         description: "How BlockNote compares to other editors",
//         url: "/resources/comparisons",
//         icon: <ShieldCheckIcon className="size-4" />,
//       },
//       {
//         groupName: "About & Trust",
//         text: "About BlockNote",
//         description: "Mission, vision, and OSS philosophy",
//         url: "/resources/about",
//         icon: <SparklesIcon className="size-4" />,
//       },
//       {
//         groupName: "About & Trust",
//         text: "Security & Privacy",
//         description: "Compliance and enterprise-grade trust",
//         url: "/resources/security-privacy",
//         icon: <LockIcon className="size-4" />,
//       },
//       {
//         groupName: "About & Trust",
//         text: "Digital Sovereignty",
//         description: "Collaborations with governments and EU initiatives",
//         url: "/resources/digital-sovereignty",
//         icon: <GlobeIcon className="size-4" />,
//       },
//       {
//         groupName: "About & Trust",
//         text: "Careers & Partners",
//         description: "Work with or join BlockNote",
//         url: "/resources/careers-partners",
//         icon: <RocketIcon className="size-4" />,
//       },
//       {
//         groupName: "About & Trust",
//         text: "Enterprise Inquiries",
//         description: "Custom consultation and collaboration",
//         url: "/resources/enterprise",
//         icon: <ActivityIcon className="size-4" />,
//       },
//     ],
//   },
// ];

const links: LinkItemType[] = [
  // {
  //   type: "menu",
  //   icon: <FaUser />,
  //   text: "Profile",
  //   items: [
  //     {
  //       text: "Getting Started",
  //       description: "Learn to use Fumadocs",
  //       url: "/docs",
  //     },
  //   ],
  // },
  {
    text: "Docs",
    url: "/docs",
    active: "nested-url",
  },
  {
    text: "AI",
    url: "/docs/features/ai",
    active: "nested-url",
  },
  {
    text: "Examples",
    url: "/examples",
    active: "nested-url",
  },
  {
    text: "Pricing",
    url: "/pricing",
    active: "url",
  },
  // {
  //   text: "About",
  //   url: "/about",
  //   active: "url",
  // },
  // {
  //   type: "icon",
  //   icon: <FaDiscord />,
  //   text: "Discord",
  //   url: "https://discord.gg/Qc2QTTH5dF",
  // },
  {
    type: "icon",
    icon: <FaGithub />,
    text: "GitHub",
    url: "https://github.com/TypeCellOS/BlockNote",
  },
  {
    type: "custom",
    on: "all",
    secondary: true,
    children: <AuthNavButton />,
  },
];
export function baseOptions(): BaseLayoutProps {
  return {
    themeSwitch: {
      enabled: false,
    },
    nav: {
      title: (
        <ThemedImage
          src={{ light: LogoLight, dark: LogoDark }}
          alt="BlockNote"
          className="w-40"
        />
      ),
    },
    links,
  };
}
