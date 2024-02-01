import type Image from "next/image";
import { FeaturesBento } from "../home-shared/FeaturesBento";

type NextImageSrc = Parameters<typeof Image>[0]["src"];

export interface FeaturesCardData {
  title: string;
  description: string;
  bgImgDark: NextImageSrc;
  bgImgLight: NextImageSrc;
}

export const featuresCardData: FeaturesCardData[] = [
  {
    title: "Animations",
    description: "",
    bgImgDark: "/img/features/animations-dark.gif",
    bgImgLight: "/img/features/animations.gif",
  },
  {
    title: "Real-time collaboration",
    description: "",
    bgImgDark: "/img/features/collaboration-dark.gif",
    bgImgLight: "/img/features/collaboration.gif",
  },
  {
    title: "Helpful placeholders",
    description: "",
    bgImgDark: "/img/features/placeholders-dark.gif",
    bgImgLight: "/img/features/placeholders.gif",
  },
  {
    title: "Nesting & indentation",
    description: "",
    bgImgDark: "/img/features/nesting-dark.gif",
    bgImgLight: "/img/features/nesting.gif",
  },
  {
    title: "Drag and drop blocks",
    description: "",
    bgImgDark: "/img/features/dragdrop-dark.gif",
    bgImgLight: "/img/features/dragdrop.gif",
  },
  {
    title: "Customizable slash (/) menu",
    description: "",
    bgImgDark: "/img/features/slashmenu-dark.gif",
    bgImgLight: "/img/features/slashmenu.gif",
  },
  {
    title: "Format menu",
    description: "",
    bgImgDark: "/img/features/formattingtoolbar-dark.gif",
    bgImgLight: "/img/features/formattingtoolbar.gif",
  },
];

export function PackFeatures() {
  return (
    <FeaturesBento
      body="With a "
      features={featuresCardData}
      header="Why BlockNote?"
    />
  );
}
