// import "../custom.css";
import { Analytics } from "@vercel/analytics/react";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { type ReactNode } from "react";
import "../styles.css";

type NextraAppProps = AppProps & {
  Component: AppProps["Component"] & {
    getLayout: (page: ReactNode) => ReactNode;
  };
};

export default function Nextra({ Component, pageProps }: NextraAppProps) {
  //   const router = useRouter();

  return (
    <>
      <SessionProvider>
        <Component {...pageProps} />
        <Analytics />
      </SessionProvider>
    </>
  );
}
