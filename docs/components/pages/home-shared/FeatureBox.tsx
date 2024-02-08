import Image from "next/image";
import type { ReactNode } from "react";

export function FeatureBox({
  name,
  description,
  iconDark,
  iconLight,
}: {
  iconDark: Parameters<typeof Image>[0]["src"];
  iconLight: Parameters<typeof Image>[0]["src"];
  name: string;
  description: ReactNode;
}) {
  return (
    <div className="relative box-border flex w-full flex-col gap-5 overflow-hidden rounded-xl border p-8 text-black no-underline dark:border-neutral-800 dark:text-white">
      <Image
        alt=""
        aria-hidden="true"
        className="hidden dark:block"
        height={64}
        src={iconDark}
        width={64}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="block dark:hidden"
        height={64}
        src={iconLight}
        width={64}
      />
      <div className="flex flex-col gap-2">
        <h3 className="font-space-grotesk m-0 font-bold leading-5 text-gray-900 dark:text-white">
          {name}
        </h3>

        <p className="m-0 leading-6 opacity-70">{description}</p>
      </div>
    </div>
  );
}
