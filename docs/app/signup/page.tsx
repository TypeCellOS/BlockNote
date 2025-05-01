import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign-up",
};

const AuthenticationPage = dynamic(() => import("../AuthenticationPage"));

export default function Register() {
  return (
    <Suspense>
      <AuthenticationPage variant="register" />
    </Suspense>
  );
}
