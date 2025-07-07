import ThemedImage from "@/components/ThemedImage";
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
      className={`card border-fd-border bg-fd-card relative flex w-[360px] max-w-full flex-col justify-between gap-1 overflow-hidden rounded-lg border ${props.thumbnail ? "row-span-2" : "row-span-1"}`}
    >
      {props.thumbnail && (
        <div
          className={
            "thumbnail before:content before:bg-linear-to-b before:to-fd-card aspect-video w-full overflow-hidden before:absolute before:block before:aspect-video before:w-full before:from-transparent"
          }
        >
          <ThemedImage
            className={"w-full"}
            src={{ light: props.thumbnail.light, dark: props.thumbnail.dark }}
            alt={props.title}
          />
        </div>
      )}
      <div className={`flex flex-col gap-6 p-8`}>
        <div className={"feature-icon h-fit w-fit rounded-lg p-1"}>
          <Icon className={"rounded-md"} size={24} />
        </div>
        <div className={"flex flex-col gap-1"}>
          <div className={"flex flex-row items-center justify-between gap-2"}>
            <span className={"text-md font-bold"}>{props.title}</span>
          </div>
          <div className={"text-sm sm:min-h-[3.75rem]"}>
            {props.description}
          </div>
        </div>
      </div>
    </div>
  );
}
