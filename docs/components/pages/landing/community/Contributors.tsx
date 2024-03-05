import { Link } from "nextra-theme-docs";
import Image from "next/image";
import { DiscordIcon, GitHubIcon } from "nextra/icons";
import { SectionSubHeader } from "@/components/pages/landing/shared/Headings";
import { JoinButton } from "@/components/pages/landing/community/JoinButton";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";

// TODO: Use GitHub API
function fetchContributors(): { username: string; avatarUrl: string }[] {
  return [
    {
      username: "YousefED",
      avatarUrl: "https://avatars.githubusercontent.com/u/368857?v=4",
    },
    {
      username: "17Amir17",
      avatarUrl: "https://avatars.githubusercontent.com/u/36531255?v=4",
    },
    {
      username: "matthewlipski",
      avatarUrl: "https://avatars.githubusercontent.com/u/50169049?v=4",
    },
    {
      username: "GuySerfaty",
      avatarUrl: "https://avatars.githubusercontent.com/u/17720782?v=4",
    },
    {
      username: "tomeryp",
      avatarUrl: "https://avatars.githubusercontent.com/u/4117403?v=4",
    },
    {
      username: "horacioh",
      avatarUrl: "https://avatars.githubusercontent.com/u/725120?v=4",
    },
    {
      username: "i-am-chitti",
      avatarUrl: "https://avatars.githubusercontent.com/u/60139930?v=4",
    },
    {
      username: "DAlperin",
      avatarUrl: "https://avatars.githubusercontent.com/u/16063713?v=4",
    },
    {
      username: "tensor-tian",
      avatarUrl: "https://avatars.githubusercontent.com/u/101185214?v=4",
    },
    {
      username: "sudarshanshenoy",
      avatarUrl: "https://avatars.githubusercontent.com/u/13462896?v=4",
    },
    {
      username: "cuire",
      avatarUrl: "https://avatars.githubusercontent.com/u/81014305?v=4",
    },
    {
      username: "fogle",
      avatarUrl: "https://avatars.githubusercontent.com/u/39360?v=4",
    },
    {
      username: "richmengsix",
      avatarUrl: "https://avatars.githubusercontent.com/u/2321921?v=4",
    },
    {
      username: "PhilipWillms",
      avatarUrl: "https://avatars.githubusercontent.com/u/44462043?v=4",
    },
    {
      username: "niclas-j",
      avatarUrl: "https://avatars.githubusercontent.com/u/35239311?v=4",
    },
    {
      username: "danlgz",
      avatarUrl: "https://avatars.githubusercontent.com/u/26347085?v=4",
    },
    {
      username: "CTNicholas",
      avatarUrl: "https://avatars.githubusercontent.com/u/33033422?v=4",
    },
    {
      username: "charlesfrisbee",
      avatarUrl: "https://avatars.githubusercontent.com/u/32081962?v=4",
    },
  ];
}

export const Contributors = () => (
  <div className="flex max-w-screen-md flex-col gap-4 lg:max-w-screen-lg">
    <FadeIn>
      <SectionSubHeader>Contributors</SectionSubHeader>
    </FadeIn>
    <FadeIn className="flex flex-wrap items-center justify-center gap-3">
      {fetchContributors().map((contributor) => (
        // <Tooltip key={contributor.id} content={contributor.login}>
        <Link
          key={contributor.username}
          href={`https://github.com/${contributor.username}`}
          rel="nofollow noreferrer noopener"
          target="_blank">
          <Image
            src={contributor.avatarUrl}
            alt={`${contributor.username} avatar`}
            className="size-12 rounded-full md:size-14"
            width={64}
            height={64}
          />
        </Link>
        // </Tooltip>
      ))}
    </FadeIn>
    <FadeIn className={"flex flex-col gap-2 py-4"}>
      <JoinButton
        text={"Become a GitHub contributor"}
        subtext={
          "Join the community of BlockNote developers by contributing code and supporting the project."
        }
        icon={GitHubIcon}
        linkTitle={"See our repository"}
        linkUrl={"https://github.com/TypeCellOS/BlockNote"}
      />
      <JoinButton
        text={"Join the Discord community"}
        subtext={
          "Ask questions, discuss features, and share your work with other BlockNote users on Discord."
        }
        icon={DiscordIcon}
        linkTitle={"Join our Server"}
        linkUrl={"https://discord.gg/Qc2QTTH5dF"}
      />
    </FadeIn>
  </div>
);
