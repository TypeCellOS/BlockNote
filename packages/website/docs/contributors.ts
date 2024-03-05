import type { DefaultTheme } from "vitepress";
import contributorNames from "./contributor-names.json";

export interface Contributor {
  name: string;
  avatar: string;
}

export interface CoreTeam extends DefaultTheme.TeamMember {
  // required to download avatars from GitHub
  github: string;
  twitter?: string;
  mastodon?: string;
  discord?: string;
  youtube?: string;
}

const contributorsAvatars: Record<string, string> = {};

const getAvatarUrl = (name: string) => `https://github.com/${name}.png`;
//   import.meta.hot
// ? `https://github.com/${name}.png`
// : `/user-avatars/${name}.png`;

export const contributors = (contributorNames as string[]).reduce(
  (acc, name) => {
    contributorsAvatars[name] = getAvatarUrl(name);
    acc.push({ name, avatar: contributorsAvatars[name] });
    return acc;
  },
  [] as Contributor[]
);
