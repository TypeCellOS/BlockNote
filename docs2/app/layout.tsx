import { Provider } from "@/components/provider";
import { EB_Garamond, Public_Sans } from "next/font/google";
import "./global.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${ebGaramond.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
