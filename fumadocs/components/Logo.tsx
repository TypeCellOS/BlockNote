"use client";

import LogoLight from "@/public/img/logos/banner.svg";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import { useTheme } from "next-themes";

export default function Logo() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? LogoDark : LogoLight;
}
