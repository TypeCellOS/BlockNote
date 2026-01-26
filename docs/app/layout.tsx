import { Provider } from "@/components/provider";
import { getFullMetadata } from "@/lib/getFullMetadata";
import { Analytics } from "@vercel/analytics/next";
import { Metadata } from "next";
import "./global.css";
import "./gradients.css";
import "./styles.css";

export const metadata: Metadata = getFullMetadata({
  title: "Javascript Block-Based React rich text editor",
  description:
    "A beautiful text editor that just works. Easily add an editor to your app that users will love. Customize it with your own functionality like custom blocks or AI tooling.",
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          {children}
          {/* <Footer /> */}
        </Provider>
        <Analytics />
      </body>
    </html>
  );
}
