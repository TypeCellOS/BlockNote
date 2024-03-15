import { useTheme } from "nextra-theme-docs";
import { Section } from "@/components/pages/landing/shared/Section";
import { Text } from "@/components/pages/landing/hero/Text";
import { Demo } from "@/components/pages/landing/hero/Demo";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";

import "./styles.css";

export function Hero() {
  const { theme } = useTheme();

  return (
    <Section className="pb-36 pt-24 xl:pt-36">
      <FadeIn
        noVertical
        className={
          "z-20 flex w-full flex-col items-center justify-between gap-6 px-6 md:max-w-screen-md xl:max-w-[1440px] xl:flex-row"
        }>
        <Text />
        <Demo
          theme={
            theme === undefined || theme === "system"
              ? undefined
              : (theme as "light" | "dark" | undefined)
          }
        />
      </FadeIn>
    </Section>
  );
}
