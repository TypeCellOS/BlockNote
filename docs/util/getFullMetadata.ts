import { Metadata } from "next";

export const getFullMetadata = (metadata: {
  title: string;
  description?: string;
  path?: string;
  ogImageTitle?: string;
}): Metadata => ({
  title: `BlockNote - ${metadata.title}`,
  description: metadata.description,
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
