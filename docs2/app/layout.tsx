import { Footer } from "@/components/Footer";
import { Provider } from "@/components/provider";
import { getFullMetadata } from "@/lib/getFullMetadata";
import { Metadata } from "next";
import { EB_Garamond, Public_Sans } from "next/font/google";
import "./global.css";
import "./gradients.css";
import "./styles.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = getFullMetadata({
  title: "Javascript Block-Based React rich text editor",
  description:
    "A beautiful text editor that just works. Easily add an editor to your app that users will love. Customize it with your own functionality like custom blocks or AI tooling.",
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${ebGaramond.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <Provider>
          {children}
          <Footer />
        </Provider>
      </body>
    </html>
  );
}
