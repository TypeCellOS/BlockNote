import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "BlockNote - Login",
  openGraph: {
    images: "/api/og?title=Login",
  },
};

// dynamic import because we use search params in the client component
const AuthenticationPage = dynamic(
  () => import("../../components/AuthenticationPage"),
);

export default function Register() {
  return (
    <Suspense>
      <AuthenticationPage variant="email" />
    </Suspense>
  );
}
