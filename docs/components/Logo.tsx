import { useTheme } from "nextra-theme-docs";

export function Logo() {
  const { theme } = useTheme();
  const Img =
    theme === "dark" ? (
      <img
        style={{ height: 32 }}
        src="/img/logos/banner.dark.svg"
        alt="BlockNote"
      />
    ) : (
      <img style={{ height: 32 }} src="/img/logos/banner.svg" alt="BlockNote" />
    );

  return <a href="/">{Img}</a>;
}
