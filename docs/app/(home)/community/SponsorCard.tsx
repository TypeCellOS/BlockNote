import ThemedImage from "@/components/ThemedImage";
import Image from "next/image";

export type SponsorCardProps = {
  name: string;
  logo: {
    light: Parameters<typeof Image>[0]["src"];
    dark: Parameters<typeof Image>[0]["src"];
  };
  link: string;
  tagline?: string;
};

export function SponsorCard(props: SponsorCardProps) {
  return (
    <a
      href={props.link}
      className="border-fd-border relative flex aspect-video max-w-[235px] items-center justify-center rounded-lg border"
    >
      <ThemedImage
        className={"h-1/3 w-3/5 object-contain"}
        src={{ light: props.logo.light, dark: props.logo.dark }}
        alt={props.name}
      />
      {props.tagline && (
        <div className={"absolute bottom-[10%] text-xs italic md:text-sm"}>
          {props.tagline}
        </div>
      )}
    </a>
  );
}
