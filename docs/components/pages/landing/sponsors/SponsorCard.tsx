import Image from "next/image";

export type SponsorCardProps = {
  name: string;
  logo: {
    light: Parameters<typeof Image>[0]["src"];
    dark: Parameters<typeof Image>[0]["src"];
  };
};

export function SponsorCard(props: SponsorCardProps) {
  return (
    <div className="flex aspect-video max-w-[244px] items-center justify-center bg-gray-100 dark:bg-gray-900 md:w-[244px]">
      <Image
        className={"block h-3/5 w-3/5 object-contain dark:hidden"}
        src={props.logo.light}
        alt={props.name}
      />
      <Image
        className={"hidden h-3/5 w-3/5 object-contain dark:block"}
        src={props.logo.dark}
        alt={props.name}
      />
    </div>
  );
}
