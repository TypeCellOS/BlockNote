import { Banner } from "fumadocs-ui/components/banner";
import { RootProvider } from "fumadocs-ui/provider";
import { Metadata } from "next";
import type { ReactNode } from "react";

import "./global.css";
import "./gradients.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "BlockNote",
  description: "BlockNote is a rich text editor for the web.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Banner
          height="2em"
          className="bg-fd-primary text-fd-primary-foreground whitespace-break-spaces"
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
