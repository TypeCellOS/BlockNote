import { getFullMetadata } from "@/util/getFullMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

export const metadata = getFullMetadata({
  title: "Sign Up",
  path: "/signup",
  ogImageTitle: "Sign Up",
});

// dynamic import because we use search params in the client component
const AuthenticationPage = dynamic(
  () => import("../../components/AuthenticationPage"),
);

export default function Register() {
  return (
    <Suspense>
      <AuthenticationPage variant="register" />
    </Suspense>
  );
}
