import { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Password Login",
};

// dynamic import because we use search params in the client component
const AuthenticationPage = dynamic(
  () => import("../../../components/AuthenticationPage"),
);

export default function Register() {
  return (
    <Suspense>
      <AuthenticationPage variant="password" />
    </Suspense>
  );
}
