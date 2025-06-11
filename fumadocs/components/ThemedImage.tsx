"use client";
import Image from "next/image";
import { useTheme } from "next-themes";

export function ThemedImage(
  props: {
    darkImage: React.ComponentProps<typeof Image>["src"];
  } & React.ComponentProps<typeof Image>,
) {
  const { resolvedTheme } = useTheme();
  const { darkImage, ...rest } = props;
  if (resolvedTheme === "dark") {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...rest} src={darkImage} suppressHydrationWarning />;
  } else {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...rest} suppressHydrationWarning />;
  }
}
