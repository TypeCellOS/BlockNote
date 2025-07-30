import { Metadata } from "next";

export const getFullMetadata = (metadata: {
  title: string;
  description?: string;
  path?: string;
  ogImageTitle?: string;
}): Metadata => ({
  title: `BlockNote - ${metadata.title}`,
  description: metadata.description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    images: `/api/og${metadata.ogImageTitle ? `?title=${metadata.ogImageTitle}` : ""}`,
    locale: "en_US",
    siteName: "BlockNote",
    type: "website",
    url: `https://www.blocknotejs.org${metadata.path || ""}`,
  },
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@TypeCellOS",
    site: "@TypeCellOS",
  },
});
