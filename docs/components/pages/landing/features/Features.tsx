import {
  RiMenuAddFill,
  RiPaintBrushFill,
  RiTeamFill,
  RiIndentIncrease,
  RiSettings3Fill,
} from "react-icons/ri";
import {
  BiLogoTypescript,
  BiLogoJavascript,
  BiLogoMarkdown,
  BiSolidWrench,
} from "react-icons/bi";
import { Section } from "@/components/pages/landing/shared/Section";
import {
  FeatureCard,
  FeatureCardProps,
} from "@/components/pages/landing/features/FeatureCard";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { SectionIntro } from "@/components/pages/landing/shared/Headings";

import worksOutOfTheBoxLight from "../../../../public/img/features/works_out_of_the_box_light.gif";
import worksOutOfTheBoxDark from "../../../../public/img/features/works_out_of_the_box_dark.gif";
import blockBasedDesignLight from "../../../../public/img/features/block_based_design_light.gif";
import blockBasedDesignDark from "../../../../public/img/features/block_based_design_dark.gif";
import collaborationLight from "../../../../public/img/features/collaboration_light.gif";
import collaborationDark from "../../../../public/img/features/collaboration_dark.gif";

export const featuresCardData: FeatureCardProps[] = [
  {
    title: "Works out of the box",
    description:
      "Built-in components like menus and toolbars instantly provide a familiar, Notion-style user experience - but are also fully customizable.",
    icon: RiSettings3Fill,
    thumbnail: {
      light: worksOutOfTheBoxLight,
      dark: worksOutOfTheBoxDark,
    },
  },
  {
    title: "Block-based design",
    description:
      "Drag, drop, or nest blocks. The block-based design enables users to create beautiful docs and unlocks a powerful API for engineers.",
    icon: RiIndentIncrease,
    thumbnail: {
      light: blockBasedDesignLight,
      dark: blockBasedDesignDark,
    },
  },
  {
    title: "Collaboration",
    description:
      "Craft beautiful multiplayer experiences with support for real-time collaboration.",
    icon: RiTeamFill,
    thumbnail: {
      light: collaborationLight,
      dark: collaborationDark,
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
    icon: BiLogoTypescript,
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
    icon: BiLogoMarkdown,
  },
  {
    title: "Prosemirror based",
    description:
      "Builds on top of the battle-tested Prosemirror, but without the steep learning curve.",
    icon: BiSolidWrench,
  },
  {
    title: "Vanilla JS",
    description:
      "Not using React? BlockNote also works with vanilla JS for use with other frameworks.",
    icon: BiLogoJavascript,
  },
];

export function Features() {
  return (
    <Section className="pb-24 pt-12 xl:pb-32 xl:pt-16">
      <div
        className={
          "z-20 flex max-w-full flex-col items-center gap-12 px-6 md:max-w-screen-md xl:max-w-none"
        }>
        <SectionIntro
          header={"Why BlockNote?"}
          subtext={
            "Whether you want extensive customization or a great out-of-the-box experience, BlockNote has you covered:"
          }
        />
        <FadeIn className="grid max-w-full grid-cols-1 gap-4 md:max-w-screen-md md:grid-cols-2 xl:max-w-none xl:grid-cols-3 xl:p-0">
          {featuresCardData.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
          {/* <p>...and more: (TODO)</p>
          <ul>
            <li>Helpful Placeholders</li>
            <li>Smooth Animations</li>
            <li>Image Uploads</li>
            <li>Resizable Tables</li>
          </ul> */}
        </FadeIn>
      </div>
    </Section>
  );
}
