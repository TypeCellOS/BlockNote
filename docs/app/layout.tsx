import { Banner } from "fumadocs-ui/components/banner";
import { RootProvider } from "fumadocs-ui/provider";
import { Metadata } from "next";
import type { ReactNode } from "react";

import "./global.css";
import "./gradients.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "BlockNote - Javascript Block-Based React rich text editor",
  description:
    "A beautiful text editor that just works. Easily add an editor to your app that users will love. Customize it with your own functionality like custom blocks or AI tooling.",
  openGraph: {
    images: "/api/og",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col [--spacing-fd-container:1566px]">
        <Banner
          height="24px"
          className="whitespace-break-spaces bg-[#fef6d5] text-black"
        >
          🚀 BlockNote AI is here!{" "}
          <a href="/docs/ai" className="italic underline">
            Access the early preview.
          </a>
        </Banner>
        <RootProvider>{children as any}</RootProvider>
      </body>
    </html>
  );
}
