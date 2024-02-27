import Image from "next/image";

export type SponsorCardProps = {
  name: string;
  logo: {
    light: Parameters<typeof Image>[0]["src"];
    dark: Parameters<typeof Image>[0]["src"];
  };
  tagline?: string;
};

export function SponsorCard(props: SponsorCardProps) {
  return (
    <div className="relative flex aspect-video max-w-[244px] items-center justify-center bg-gray-100 dark:bg-gray-900 md:w-[244px]">
      <Image
        className={"block h-1/3 w-3/5 object-contain dark:hidden"}
        src={props.logo.light}
        alt={props.name}
      />
      <Image
        className={"hidden h-1/3 w-3/5 object-contain dark:block"}
        src={props.logo.dark}
        alt={props.name}
      />
      {props.tagline && (
        <div className={"absolute bottom-[10%] text-xs font-bold md:text-sm"}>
          {props.tagline}
        </div>
      )}
    </div>
  );
}
