import Image from "next/image";
import { IconType } from "react-icons";

export type FeatureCardProps = {
  title: string;
  description: string;
  icon: IconType;
  thumbnail?: {
    light: Parameters<typeof Image>[0]["src"];
    dark: Parameters<typeof Image>[0]["src"];
  };
};

export function FeatureCard(props: FeatureCardProps) {
  const Icon = props.icon;

  return (
    <div
      className={`card relative w-[360px] max-w-full flex-col overflow-hidden rounded-lg border ${props.thumbnail ? "row-span-2" : "row-span-1"}`}>
      {props.thumbnail && (
        <div className={"thumbnail aspect-video w-full overflow-hidden"}>
          <Image
            className={"block w-full dark:hidden"}
            src={props.thumbnail.light}
            alt={props.title}
          />
          <Image
            className={"hidden w-full dark:block"}
            src={props.thumbnail.dark}
            alt={props.title}
          />
        </div>
      )}
      <div className={`flex flex-col gap-8 p-8`}>
        <div className={"feature-icon h-fit w-fit rounded-lg p-1"}>
          <Icon className={"rounded-md"} size={24} />
        </div>
        <div className={"flex flex-col gap-1"}>
          <div className={"flex flex-row items-center justify-between gap-2"}>
            <span className={"text-md font-bold"}>{props.title}</span>
          </div>
          <div className={"text-sm"}>{props.description}</div>
        </div>
      </div>
    </div>
  );
}
