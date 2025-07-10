import { AuthNavButton } from "@/components/AuthNavButton";
import ThemedImage from "@/components/ThemedImage";
import LogoLight from "@/public/img/logos/banner.svg";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import {
  NavbarSidebarTrigger,
  type DocsLayoutProps,
} from "fumadocs-ui/layouts/docs";
import { FaBook, FaCode, FaDiscord, FaGithub } from "react-icons/fa";
import { HomeLayoutProps } from "fumadocs-ui/layouts/home";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: Partial<DocsLayoutProps & HomeLayoutProps> = {
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
  links: [
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
      url: "/docs/ai",
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
    {
      text: "About",
      url: "/pages/about",
      active: "url",
    },
    {
      type: "icon",
      icon: <FaDiscord />,
      text: "Discord",
      url: "https://discord.gg/Qc2QTTH5dF",
    },
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
    {
      type: "custom",
      on: "all",
      secondary: true,
      children: <NavbarSidebarTrigger className="-me-1.5 p-2 md:hidden" />,
    },
  ],
  sidebar: {
    tabs: [
      {
        icon: (
          <FaBook className="border-fd-primary text-fd-primary bg-fd-primary/10 h-5 w-5 rounded-sm border p-0.5" />
        ),
        title: "Documentation",
        description: "Learn how to use BlockNote",
        url: "/docs",
        props: {
          className: "fesfesfes",
        },
      },
      {
        icon: (
          <FaCode className="border-fd-primary text-fd-primary bg-fd-primary/10 h-5 w-5 rounded-sm border p-0.5" />
        ),
        title: "Examples",
        description: "See BlockNote in action",
        url: "/examples",
        props: {
          className: "fesfesfes",
        },
      },
    ],
  },
};
