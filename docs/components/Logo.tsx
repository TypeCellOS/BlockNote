import Image from "next/image";
import { useTheme } from "nextra-theme-docs";

export function Logo() {
  const { theme } = useTheme();
  const Img =
    theme === "dark" ? (
      <Image
        style={{ height: 32 }}
        src="/img/logos/banner.dark.svg"
        alt="BlockNote"
      />
    ) : (
      <Image style={{ height: 32 }} src="/img/logos/banner.svg" alt="BlockNote" />
    );

  return <a href="/">{Img}</a>;
}
