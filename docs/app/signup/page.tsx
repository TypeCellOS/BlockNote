import { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// dynamic import because we use search params in the client component
const AuthenticationPage = dynamic(
  () => import("../../components/AuthenticationPage"),
);

export const metadata: Metadata = {
  title: "Sign-up",
};

export default function Register() {
  return (
    <Suspense>
      <AuthenticationPage variant="register" />
    </Suspense>
  );
}
