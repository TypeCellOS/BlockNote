import { FadeIn } from "@/components/FadeIn";
import { Section } from "@/components/Section";
import { Demo } from "./Demo";
import { Text } from "./Text";

import "./styles.css";

export function Hero() {
  return (
    <Section className="pb-36 pt-24 xl:pt-36">
      <FadeIn
        noVertical
        className={
          "z-20 flex w-full flex-col items-center justify-between gap-6 px-6 md:max-w-screen-md xl:max-w-[1440px] xl:flex-row"
        }
      >
        <Text />
        <Demo />
      </FadeIn>
    </Section>
  );
}
