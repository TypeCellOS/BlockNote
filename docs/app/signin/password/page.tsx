import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
export const metadata: Metadata = {
  title: "Password Login",
};

const AuthenticationPage = dynamic(() => import("../../AuthenticationPage"));

export default function Register() {
  return (
    <Suspense>
      <AuthenticationPage variant="password" />
    </Suspense>
  );
}
