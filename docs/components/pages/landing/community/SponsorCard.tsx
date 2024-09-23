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
      className="relative flex aspect-video max-w-[235px] items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900 md:w-[235px]">
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
        <div className={"absolute bottom-[10%] text-xs  italic md:text-sm"}>
          {props.tagline}
        </div>
      )}
    </a>
  );
}
