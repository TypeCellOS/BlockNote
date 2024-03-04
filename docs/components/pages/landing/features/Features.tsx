import {
  SectionHeader,
  SectionSubtext,
} from "@/components/pages/home-shared/Headings";
import {
  FeatureCard,
  FeatureCardProps,
} from "@/components/pages/landing/features/FeatureCard";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import {
  RiJavascriptFill,
  RiMarkdownFill,
  RiMenuAddFill,
  RiPaintBrushFill,
  RiTeamFill,
} from "react-icons/ri";

import slashMenuImageLight from "../../../../public/img/screenshots/slash_menu.png";
import slashMenuImageDark from "../../../../public/img/screenshots/slash_menu_dark.png";

// TODO: icons, images
export const featuresCardData: FeatureCardProps[] = [
  {
    title: "Modern UX",
    description:
      "Built-in components like menus and toolbars instantly provide a familiar, Notion-style user experience - but are also fully customizable.",
    icon: RiMenuAddFill,
    thumbnail: {
      light: slashMenuImageLight,
      dark: slashMenuImageDark,
    },
  },
  {
    title: "Block-based design",
    description:
      "Drag, drop, or nest blocks. The block-based design enables users to create beautiful docs and unlocks a powerful API for engineers.",
    icon: RiMenuAddFill,
    thumbnail: {
      light: slashMenuImageLight,
      dark: slashMenuImageDark,
    },
  },
  {
    title: "Collaboration",
    description:
      "Craft beautiful multiplayer experiences with support for real-time collaboration.",
    icon: RiTeamFill,
    thumbnail: {
      light: slashMenuImageLight,
      dark: slashMenuImageDark,
    },
  },
  {
    title: "Extensibility",
    description:
      "Want to go next level? Extend the editor with custom blocks, schemas, and plugins.",
    icon: RiMenuAddFill,
  },
  {
    title: "First-class Typescript support",
    description:
      "Get full type safety and autocompletion even when extending your editor with custom blocks and schemas.",
    icon: RiMenuAddFill,
  },
  {
    title: "Theming",
    description:
      "Customize the look and feel of your editor to match your brand. Built-in support for light & dark modes.",
    icon: RiPaintBrushFill,
  },

  {
    title: "Markdown & HTML",
    description:
      "Convert documents from BlockNote JSON to and from Markdown and HTML.",
    icon: RiMarkdownFill,
  },
  {
    title: "Prosemirror based",
    description:
      "Builds on top of the battle-tested Prosemirror, but without the steep learning curve.",
    icon: RiMarkdownFill,
  },
  {
    title: "Vanilla JS",
    description:
      "Not using React? BlockNote also works with vanilla JS for use with other frameworks.",
    icon: RiJavascriptFill,
  },
];

export function Features() {
  return (
    <section className="relative flex flex-col items-center gap-9 overflow-hidden py-16 pb-16 font-sans md:pb-24 lg:gap-14 lg:pb-32">
      <FadeIn noVertical className={"absolute top-0 z-10 h-full w-full"}>
        <div className={"section-glow h-full w-full"} />
      </FadeIn>
      <div
        className={
          "z-20 flex max-w-full flex-col items-center gap-12 px-4 md:max-w-screen-md xl:max-w-none"
        }>
        <FadeIn className="flex max-w-full flex-col items-center gap-2 text-center md:max-w-screen-md md:gap-4">
          <SectionHeader>Why BlockNote?</SectionHeader>
          <SectionSubtext>
            Whether you want extensive customization or a great out-of-the-box
            experience, BlockNote has you covered:
          </SectionSubtext>
        </FadeIn>
        <FadeIn className="grid max-w-full grid-cols-1 gap-4 md:max-w-screen-md md:grid-cols-2 xl:max-w-none xl:grid-cols-3 xl:gap-6 xl:p-0">
          {featuresCardData.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
          <p>...and more: (TODO)</p>
          <ul>
            <li>Helpful Placeholders</li>
            <li>Smooth Animations</li>
            <li>Image Uploads</li>
            <li>Resizable Tables</li>
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}
