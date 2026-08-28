import { Footer } from "@/components/Footer";
import { Provider } from "@/components/provider";
import { getFullMetadata } from "@/lib/getFullMetadata";
import { Analytics } from "@vercel/analytics/next";
import { Metadata, Viewport } from "next";
import "./global.css";
import "./gradients.css";
import "./styles.css";

export const metadata: Metadata = getFullMetadata({
  title: "Javascript Block-Based React rich text editor",
  description:
    "A beautiful text editor that just works. Easily add an editor to your app that users will love. Customize it with your own functionality like custom blocks or AI tooling.",
});

// Resizes the layout viewport (not just the visual viewport) when a virtual
// keyboard opens, so `position: fixed` elements can be pinned to the top of the
// keyboard. Must be set in the initial HTML, so it lives here rather than in an
// example's App. Mirrors the examples' generated `index.html` viewport meta.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          {children}
          <Footer />
        </Provider>
        <Analytics />
      </body>
    </html>
  );
}
