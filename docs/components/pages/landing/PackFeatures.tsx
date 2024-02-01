import type Image from "next/image";
import { FeaturesBento } from "../home-shared/FeaturesBento";

type NextImageSrc = Parameters<typeof Image>[0]["src"];

export interface Feature {
  name: string;
  description: string;
  iconDark: NextImageSrc;
  iconLight: NextImageSrc;
  page: "all" | "home" | "docs";
}

export type Features = Feature[];

const REPO_FEATURES: Features = [
  {
    name: "Incremental builds",
    description: `Building once is painful enough, Turborepo will remember what you've built and skip the stuff that's already been computed.`,
    iconDark: "",
    iconLight: "",
    page: "all",
  },
  {
    name: "Content-aware hashing",
    description: `Turborepo looks at the contents of your files, not timestamps to figure out what needs to be built.`,
    iconDark: "",
    iconLight: "",
    page: "home",
  },
  {
    name: "Parallel execution",
    description: `Execute builds using every core at maximum parallelism without wasting idle CPUs.`,
    iconDark: "",
    iconLight: "",
    page: "all",
  },
  {
    name: "Remote Caching",
    description: `Share a remote build cache with your teammates and CI/CD for even faster builds.`,
    iconDark: "",
    iconLight: "",
    page: "all",
  },
  {
    name: "Zero runtime overhead",
    description: `Turborepo won’t interfere with your runtime code or touch your sourcemaps. `,
    iconDark: "",
    iconLight: "",
    page: "all",
  },
  {
    name: "Pruned subsets",
    description: `Speed up PaaS deploys by generating a subset of your monorepo with only what's needed to build a specific target.`,
    iconDark: "",
    iconLight: "",
    page: "all",
  },
  {
    name: "Task pipelines",
    description: `Define the relationships between your tasks and then let Turborepo optimize what to build and when.`,
    iconDark: "",
    iconLight: "",
    page: "all",
  },
  {
    name: "Meets you where you’re at",
    description: `Using Lerna? Keep your package publishing workflow and use Turborepo to turbocharge task running.`,
    iconDark: "",
    iconLight: "",
    page: "home",
  },
  {
    name: `Profile in your browser`,
    description: `Generate build profiles and import them in Chrome or Edge to understand which tasks are taking the longest.`,
    iconDark: "",
    iconLight: "",
    page: "home",
  },
];

export function PackFeatures() {
  return (
    <FeaturesBento
      body="With incremental behavior and adaptable bundling strategies, Turbopack provides a fast and flexible development experience for apps of any size."
      features={REPO_FEATURES}
      header="Why Turbopack?"
    />
  );
}
