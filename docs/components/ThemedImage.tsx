import Image from "next/image";

export default function ThemedImage(
  props: Omit<Parameters<typeof Image>[0], "src"> & {
    src: {
      light: Parameters<typeof Image>[0]["src"];
      dark: Parameters<typeof Image>[0]["src"];
    };
  },
) {
  const { src, className, ...rest } = props;

  return (
    <>
      <Image
        src={src.light}
        className={className + " block dark:hidden"}
        {...rest}
      />
      <Image
        src={src.dark}
        className={className + " hidden dark:block"}
        {...rest}
      />
    </>
  );
}
