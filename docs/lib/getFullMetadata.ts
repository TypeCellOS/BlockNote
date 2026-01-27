import { Metadata } from "next";

export const getFullMetadata = (metadata: {
  title: string;
  description?: string;
  path?: string;
  openGraphImages?: Exclude<Metadata["openGraph"], null | undefined>["images"];
}): Metadata => ({
  metadataBase: "https://www.blocknotejs.org",
  title: `BlockNote - ${metadata.title}`,
  description: metadata.description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", type: "image/png" },
  },
  manifest: "/site.webmanifest",
  openGraph: {
    images: metadata.openGraphImages || "/og/image.png",
    locale: "en_US",
    siteName: "BlockNote",
    type: "website",
    url: metadata.path || "/",
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
