import Image from "next/image";
import { useTheme } from "nextra-theme-docs";

export function ThemedImage(
  props: {
    darkImage: React.ComponentProps<typeof Image>["src"];
  } & React.ComponentProps<typeof Image>,
) {
  const { theme } = useTheme();
  const { darkImage, ...rest } = props;
  if (theme === "dark") {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...rest} src={darkImage} />;
  } else {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...rest} />;
  }
}
