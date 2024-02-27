import { FC } from "react";
import { SectionHeader, SectionSubtext } from "../../home-shared/Headings";
import { Join } from "@/components/pages/landing/community/Join";
import { DiscordIcon, GitHubIcon } from "nextra/icons";
import { Contributors } from "@/components/pages/landing/community/Contributors";

export const Community: FC = () => (
  <section>
    <div className="mx-auto flex flex-col items-center gap-12 px-4 py-8 lg:px-20 lg:py-24">
      <div className="flex flex-col items-center justify-center gap-2 text-center md:max-w-screen-md md:gap-4">
        <SectionHeader>Community contributors</SectionHeader>
        <SectionSubtext>
          Join a community of open-source contributors by tuning in with the
          BlockNote community and contributing to the project.
        </SectionSubtext>
      </div>
      <Contributors />
      <div className={"flex flex-col gap-2"}>
        <Join
          text={"Become a GitHub contributor"}
          subtext={
            "Join the community of BlockNote developers by contributing code and supporting the project"
          }
          icon={GitHubIcon}
          linkTitle={"See our repository"}
          linkUrl={"https://github.com/TypeCellOS/BlockNote"}
        />
        <Join
          text={"Join the Discord community"}
          subtext={
            "Ask questions, request features, and share your work with other BlockNote users on Discord"
          }
          icon={DiscordIcon}
          linkTitle={"Join our Server"}
          linkUrl={"https://discord.gg/Qc2QTTH5dF"}
        />
      </div>
    </div>
  </section>
);
