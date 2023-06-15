export interface Sponsors {
  name: string;
  imgDark: string;
  imgLight: string;
}

export const sponsors: Sponsors[] = [
  {
    name: "Fermat",
    imgDark: "/img/sponsors/typecell-dark.svg",
    imgLight: "/img/sponsors/typecell.svg",
  },
  {
    name: "NLNet",
    imgDark: "/img/sponsors/fermat-dark.png",
    imgLight: "/img/sponsors/fermat.png",
  },
  {
    name: "TypeCell",
    imgDark: "/img/sponsors/nlnet-dark.svg",
    imgLight: "/img/sponsors/nlnet.svg",
  },
];

export interface FeaturesCardData {
  title: string;
  description: string;
  bgImgDark: string;
  bgImgLight: string;
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

export interface ProjectsUsingWCCardData {
  title: string;
  description: string;
  url?: string;
  urlTitle?: string;
  imgPath: {
    dark: string;
    light: string;
  };
}

export const projectsUsingWCCardData: ProjectsUsingWCCardData[] = [];

export interface TestimonialCardData {
  author: {
    name: string;
    title?: string;
  };
  imgPath?: {
    author?: string;
    logo?: string;
    logoDark?: string;
    logoLight?: string;
  };
  quote: string;
}

export const testimonialCardData: TestimonialCardData[] = [];

export const footerSections = [];
