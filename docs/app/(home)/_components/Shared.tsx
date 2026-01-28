"use client";
import ThemedImage from "@/components/ThemedImage";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import LogoLight from "@/public/img/logos/banner.svg";
import React from "react";

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <ThemedImage
      src={{ light: LogoLight, dark: LogoDark }}
      alt="BlockNote Logo"
      className={className}
    />
  );
};
